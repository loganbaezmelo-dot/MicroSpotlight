// --- 1. Scene, Camera, Renderer Setup ---
const container = document.getElementById("viewport-container");
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x181a1f);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 10000);
camera.position.set(0, 250, 450);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
container.appendChild(renderer.domElement);

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;

// Lighting
scene.add(new THREE.AmbientLight(0xffffff, 0.7));
const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(200, 400, 200);
scene.add(dirLight);

// Reference Grid
const gridHelper = new THREE.GridHelper(5000, 100, 0x444b5d, 0x252830);
gridHelper.position.y = -0.5;
scene.add(gridHelper);

// --- 2. Lightweight Archetypes ---
const objectLibrary = {
  Coin: {
    color: 0xffcc00,
    geo: new THREE.CylinderGeometry(15, 15, 4, 16),
    defaultRot: [90, 0, 0]
  },
  Kuribo: {
    color: 0x8b4513,
    geo: new THREE.ConeGeometry(20, 35, 16),
    defaultRot: [0, 0, 0]
  },
  QuestionBlock: {
    color: 0xee9900,
    geo: new THREE.BoxGeometry(40, 40, 40),
    defaultRot: [0, 0, 0]
  },
  Dokan: {
    color: 0x22aa33,
    geo: new THREE.CylinderGeometry(30, 30, 60, 16),
    defaultRot: [0, 0, 0]
  }
};

const levelObjects = [];
let selectedObject = null;

// --- 3. Spawning & Selection ---
function spawnObject(unitConfigName, pos = { x: 0, y: 20, z: 0 }, rot = null, scale = { x: 1, y: 1, z: 1 }) {
  const meta = objectLibrary[unitConfigName] || objectLibrary.QuestionBlock;
  const mat = new THREE.MeshStandardMaterial({ 
    color: meta.color, 
    roughness: 0.4, 
    metalness: 0.1 
  });
  const mesh = new THREE.Mesh(meta.geo, mat);

  mesh.position.set(pos.x, pos.y, pos.z);
  const r = rot || meta.defaultRot;
  mesh.rotation.set(
    THREE.MathUtils.degToRad(r[0]),
    THREE.MathUtils.degToRad(r[1]),
    THREE.MathUtils.degToRad(r[2])
  );
  mesh.scale.set(scale.x, scale.y, scale.z);

  mesh.userData = {
    UnitConfigName: unitConfigName,
    Id: `obj_${Date.now()}_${Math.floor(Math.random() * 1000)}`
  };

  scene.add(mesh);
  levelObjects.push(mesh);
  selectObject(mesh);
}

function selectObject(mesh) {
  if (selectedObject && selectedObject.material.emissive) {
    selectedObject.material.emissive.setHex(0x000000);
  }
  selectedObject = mesh;
  if (selectedObject) {
    selectedObject.material.emissive.setHex(0x334466);
    updateInspectorUI();
  } else {
    document.getElementById("inspector-fields").classList.add("hidden");
    document.getElementById("empty-state").classList.remove("hidden");
  }
}

// Raycasting (Touch / Mouse Selection)
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

function handlePointer(event) {
  const x = event.clientX || (event.touches && event.touches[0].clientX);
  const y = event.clientY || (event.touches && event.touches[0].clientY);
  if (!x || !y) return;

  mouse.x = (x / window.innerWidth) * 2 - 1;
  mouse.y = -(y / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(levelObjects);

  if (intersects.length > 0) {
    selectObject(intersects[0].object);
  } else if (!event.target.closest("#inspector") && !event.target.closest("#toolbar")) {
    selectObject(null);
  }
}

window.addEventListener("pointerdown", (e) => {
  if (e.target.closest("#inspector") || e.target.closest("#toolbar")) return;
  handlePointer(e);
});

// --- 4. Inspector UI Sync ---
const inputName = document.getElementById("prop-name");
const inputX = document.getElementById("prop-x");
const inputY = document.getElementById("prop-y");
const inputZ = document.getElementById("prop-z");
const inputRX = document.getElementById("prop-rx");
const inputRY = document.getElementById("prop-ry");
const inputRZ = document.getElementById("prop-rz");
const inputSX = document.getElementById("prop-sx");
const inputSY = document.getElementById("prop-sy");
const inputSZ = document.getElementById("prop-sz");

function updateInspectorUI() {
  if (!selectedObject) return;
  document.getElementById("empty-state").classList.add("hidden");
  document.getElementById("inspector-fields").classList.remove("hidden");

  inputName.value = selectedObject.userData.UnitConfigName;
  inputX.value = Math.round(selectedObject.position.x);
  inputY.value = Math.round(selectedObject.position.y);
  inputZ.value = Math.round(selectedObject.position.z);

  inputRX.value = Math.round(THREE.MathUtils.radToDeg(selectedObject.rotation.x));
  inputRY.value = Math.round(THREE.MathUtils.radToDeg(selectedObject.rotation.y));
  inputRZ.value = Math.round(THREE.MathUtils.radToDeg(selectedObject.rotation.z));

  inputSX.value = selectedObject.scale.x.toFixed(1);
  inputSY.value = selectedObject.scale.y.toFixed(1);
  inputSZ.value = selectedObject.scale.z.toFixed(1);
}

function applyInspectorChanges() {
  if (!selectedObject) return;
  selectedObject.position.set(parseFloat(inputX.value) || 0, parseFloat(inputY.value) || 0, parseFloat(inputZ.value) || 0);
  selectedObject.rotation.set(
    THREE.MathUtils.degToRad(parseFloat(inputRX.value) || 0),
    THREE.MathUtils.degToRad(parseFloat(inputRY.value) || 0),
    THREE.MathUtils.degToRad(parseFloat(inputRZ.value) || 0)
  );
  selectedObject.scale.set(parseFloat(inputSX.value) || 1, parseFloat(inputSY.value) || 1, parseFloat(inputSZ.value) || 1);
}

[inputX, inputY, inputZ, inputRX, inputRY, inputRZ, inputSX, inputSY, inputSZ].forEach(input => {
  input.addEventListener("input", applyInspectorChanges);
});

// Delete
document.getElementById("btn-delete").addEventListener("click", () => {
  if (!selectedObject) return;
  scene.remove(selectedObject);
  const idx = levelObjects.indexOf(selectedObject);
  if (idx > -1) levelObjects.splice(idx, 1);
  selectObject(null);
});

// Add Buttons
document.getElementById("btn-add-coin").onclick = () => spawnObject("Coin");
document.getElementById("btn-add-goomba").onclick = () => spawnObject("Kuribo");
document.getElementById("btn-add-block").onclick = () => spawnObject("QuestionBlock");
document.getElementById("btn-add-pipe").onclick = () => spawnObject("Dokan");

// --- 5. Export / Import (BYML JSON) ---
document.getElementById("btn-export").onclick = () => {
  const exportData = {
    Objs: levelObjects.map(obj => ({
      UnitConfigName: obj.userData.UnitConfigName,
      Translate: { X: obj.position.x, Y: obj.position.y, Z: obj.position.z },
      Rotate: { 
        X: THREE.MathUtils.radToDeg(obj.rotation.x), 
        Y: THREE.MathUtils.radToDeg(obj.rotation.y), 
        Z: THREE.MathUtils.radToDeg(obj.rotation.z) 
      },
      Scale: { X: obj.scale.x, Y: obj.scale.y, Z: obj.scale.z }
    }))
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "SM3DW_StageDesign.json";
  a.click();
  URL.revokeObjectURL(url);
};

document.getElementById("file-import").onchange = (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const data = JSON.parse(event.target.result);
      if (!data.Objs || !Array.isArray(data.Objs)) {
        alert("Invalid format: expected JSON with an 'Objs' array.");
        return;
      }
      levelObjects.forEach(obj => scene.remove(obj));
      levelObjects.length = 0;
      selectObject(null);

      data.Objs.forEach(item => {
        spawnObject(
          item.UnitConfigName,
          { x: item.Translate?.X || 0, y: item.Translate?.Y || 0, z: item.Translate?.Z || 0 },
          [item.Rotate?.X || 0, item.Rotate?.Y || 0, item.Rotate?.Z || 0],
          { x: item.Scale?.X || 1, y: item.Scale?.Y || 1, z: item.Scale?.Z || 1 }
        );
      });
    } catch (err) {
      alert("Failed to parse JSON file.");
    }
  };
  reader.readAsText(file);
};

// --- 6. Resize & Render Loop ---
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();

// Spawn starter block
spawnObject("QuestionBlock", { x: 0, y: 20, z: 0 });
