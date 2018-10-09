/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const { select, makeUid } = require('./state');

const {
  dragging,
  dragVector,
  cursorPosition,
  gestureEnd,
  metaHeld,
  mouseButton,
  mouseDowned,
  mouseIsDown,
  optionHeld,
  pressedKeys,
  shiftHeld,
} = require('./gestures');

const { shapesAt, landmarkPoint } = require('./geometry');

const matrix = require('./matrix');
const matrix2d = require('./matrix2d');

const config = require('./config');

const {
  applyTolerance,
  disjunctiveUnion,
  identity,
  flatten,
  mean,
  not,
  removeDuplicates,
  shallowEqual,
} = require('./functional');

/**
 * Selectors directly from a state object
 */

const primaryUpdate = state => state.primaryUpdate;
const scene = state => state.currentScene;

/**
 * Pure calculations
 */

// returns the currently dragged shape, or a falsey value otherwise
const draggingShape = ({ draggedShape, shapes }, hoveredShape, down, mouseDowned) => {
  const dragInProgress =
    down &&
    shapes.reduce((prev, next) => prev || (draggedShape && next.id === draggedShape.id), false);
  const result = (dragInProgress && draggedShape) || (down && mouseDowned && hoveredShape);
  return result;
};

/**
 * Scenegraph update based on events, gestures...
 */

const shapes = select(scene => scene.shapes)(scene);

const hoveredShapes = select((shapes, cursorPosition) =>
  shapesAt(
    shapes.filter(
      // second AND term excludes intra-group element hover (and therefore drag & drop), todo: remove this current limitation
      s =>
        (s.type !== 'annotation' || s.interactive) &&
        (config.intraGroupManipulation || !s.parent || s.type === 'annotation')
    ),
    cursorPosition
  )
)(shapes, cursorPosition);

const depthIndex = 0;
const hoveredShape = select(
  hoveredShapes => (hoveredShapes.length ? hoveredShapes[depthIndex] : null)
)(hoveredShapes);

const draggedShape = select(draggingShape)(scene, hoveredShape, mouseIsDown, mouseDowned);

// the currently dragged shape is considered in-focus; if no dragging is going on, then the hovered shape
const focusedShape = select((draggedShape, hoveredShape) => draggedShape || hoveredShape)(
  draggedShape,
  hoveredShape
);

// focusedShapes has updated position etc. information while focusedShape may have stale position
const focusedShapes = select((shapes, focusedShape) =>
  shapes.filter(shape => focusedShape && shape.id === focusedShape.id)
)(shapes, focusedShape);

const keyTransformGesture = select(
  keys =>
    config.shortcuts
      ? Object.keys(keys)
          .map(keypress => {
            switch (keypress) {
              case 'KeyW':
                return { transform: matrix.translate(0, -5, 0) };
              case 'KeyA':
                return { transform: matrix.translate(-5, 0, 0) };
              case 'KeyS':
                return { transform: matrix.translate(0, 5, 0) };
              case 'KeyD':
                return { transform: matrix.translate(5, 0, 0) };
              case 'KeyF':
                return { transform: matrix.translate(0, 0, -20) };
              case 'KeyC':
                return { transform: matrix.translate(0, 0, 20) };
              case 'KeyX':
                return { transform: matrix.rotateX(Math.PI / 45) };
              case 'KeyY':
                return { transform: matrix.rotateY(Math.PI / 45 / 1.3) };
              case 'KeyZ':
                return { transform: matrix.rotateZ(Math.PI / 45 / 1.6) };
              case 'KeyI':
                return { transform: matrix.scale(1, 1.05, 1) };
              case 'KeyJ':
                return { transform: matrix.scale(1 / 1.05, 1, 1) };
              case 'KeyK':
                return { transform: matrix.scale(1, 1 / 1.05, 1) };
              case 'KeyL':
                return { transform: matrix.scale(1.05, 1, 1) };
              case 'KeyP':
                return { transform: matrix.perspective(2000) };
              case 'KeyR':
                return { transform: matrix.shear(0.1, 0) };
              case 'KeyT':
                return { transform: matrix.shear(-0.1, 0) };
              case 'KeyU':
                return { transform: matrix.shear(0, 0.1) };
              case 'KeyH':
                return { transform: matrix.shear(0, -0.1) };
              case 'KeyM':
                return { transform: matrix.UNITMATRIX, sizes: [1.0, 0, 0, 0, 1.0, 0, 10, 0, 1] };
              case 'Backspace':
              case 'Delete':
                return { transform: matrix.UNITMATRIX, delete: true };
            }
          })
          .filter(identity)
      : []
)(pressedKeys);

const alterSnapGesture = select(metaHeld => (metaHeld ? ['relax'] : []))(metaHeld);

const multiselectModifier = shiftHeld; // todo abstract out keybindings

const initialTransformTuple = {
  deltaX: 0,
  deltaY: 0,
  transform: null,
  cumulativeTransform: null,
};

const mouseTransformGesturePrev = select(
  ({ mouseTransformState }) => mouseTransformState || initialTransformTuple
)(scene);

const mouseTransformState = select((prev, dragging, { x0, y0, x1, y1 }) => {
  if (dragging) {
    const deltaX = x1 - x0;
    const deltaY = y1 - y0;
    const transform = matrix.translate(deltaX - prev.deltaX, deltaY - prev.deltaY, 0);
    const cumulativeTransform = matrix.translate(deltaX, deltaY, 0);
    return {
      deltaX,
      deltaY,
      transform,
      cumulativeTransform,
    };
  } else {
    return initialTransformTuple;
  }
})(mouseTransformGesturePrev, dragging, dragVector);

const mouseTransformGesture = select(tuple =>
  [tuple]
    .filter(tuple => tuple.transform)
    .map(({ transform, cumulativeTransform }) => ({ transform, cumulativeTransform }))
)(mouseTransformState);

const transformGestures = select((keyTransformGesture, mouseTransformGesture) =>
  keyTransformGesture.concat(mouseTransformGesture)
)(keyTransformGesture, mouseTransformGesture);

const restateShapesEvent = select(
  action => (action && action.type === 'restateShapesEvent' ? action.payload : null)
)(primaryUpdate);

// directSelect is an API entry point (via the `shapeSelect` action) that lets the client directly specify what thing
// is selected, as otherwise selection is driven by gestures and knowledge of element positions
const directSelect = select(
  action => (action && action.type === 'shapeSelect' ? action.payload : null)
)(primaryUpdate);

const selectedShapeObjects = select(scene => scene.selectedShapeObjects || [])(scene);

const singleSelect = (prev, hoveredShapes, metaHeld, uid) => {
  // cycle from top ie. from zero after the cursor position changed ie. !sameLocation
  const down = true; // this function won't be called otherwise
  const depthIndex =
    config.depthSelect && metaHeld
      ? (prev.depthIndex + (down && !prev.down ? 1 : 0)) % hoveredShapes.length
      : 0;
  return {
    shapes: hoveredShapes.length ? [hoveredShapes[depthIndex]] : [],
    uid,
    depthIndex: hoveredShapes.length ? depthIndex : 0,
    down,
  };
};

const multiSelect = (prev, hoveredShapes, metaHeld, uid, selectedShapeObjects) => {
  const shapes =
    hoveredShapes.length > 0
      ? disjunctiveUnion(shape => shape.id, selectedShapeObjects, hoveredShapes.slice(0, 1)) // ie. depthIndex of 0, if any
      : [];
  return {
    shapes,
    uid,
    depthIndex: 0,
    down: false,
  };
};

const selectedShapesPrev = select(
  scene =>
    scene.selectionState || {
      shapes: [],
      uid: null,
      depthIndex: 0,
      down: false,
    }
)(scene);

const reselectShapes = (allShapes, shapes) =>
  shapes.map(id => allShapes.find(shape => shape.id === id));

const contentShape = allShapes => shape =>
  shape.type === 'annotation'
    ? contentShape(allShapes)(allShapes.find(s => s.id === shape.parent))
    : shape;

const contentShapes = (allShapes, shapes) => shapes.map(contentShape(allShapes));

const selectionState = select(
  (
    prev,
    selectedShapeObjects,
    hoveredShapes,
    { down, uid },
    metaHeld,
    multiselect,
    directSelect,
    allShapes
  ) => {
    const uidUnchanged = uid === prev.uid;
    const mouseButtonUp = !down;
    const updateFromDirectSelect =
      directSelect &&
      directSelect.shapes &&
      !shallowEqual(directSelect.shapes, selectedShapeObjects.map(shape => shape.id));
    if (updateFromDirectSelect) {
      return {
        shapes: reselectShapes(allShapes, directSelect.shapes),
        uid: directSelect.uid,
        depthIndex: prev.depthIndex,
        down: prev.down,
      };
    }
    if (selectedShapeObjects) prev.shapes = selectedShapeObjects.slice();
    // take action on mouse down only, and if the uid changed (except with directSelect), ie. bail otherwise
    if (mouseButtonUp || (uidUnchanged && !directSelect)) return { ...prev, down, uid, metaHeld };
    const selectFunction = config.singleSelect || !multiselect ? singleSelect : multiSelect;
    return selectFunction(prev, hoveredShapes, metaHeld, uid, selectedShapeObjects);
  }
)(
  selectedShapesPrev,
  selectedShapeObjects,
  hoveredShapes,
  mouseButton,
  metaHeld,
  multiselectModifier,
  directSelect,
  shapes
);

const selectedShapes = select(selectionTuple => {
  return selectionTuple.shapes;
})(selectionState);

const selectedShapeIds = select(shapes => shapes.map(shape => shape.id))(selectedShapes);

const primaryShape = shape => shape.parent || shape.id; // fixme unify with contentShape

const selectedPrimaryShapeIds = select(shapes => shapes.map(primaryShape))(selectedShapes);

const rotationManipulation = ({
  shape,
  directShape,
  cursorPosition: { x, y },
  alterSnapGesture,
}) => {
  // rotate around a Z-parallel line going through the shape center (ie. around the center)
  if (!shape || !directShape) return { transforms: [], shapes: [] };
  const center = shape.transformMatrix;
  const centerPosition = matrix.mvMultiply(center, matrix.ORIGIN);
  const vector = matrix.mvMultiply(
    matrix.multiply(center, directShape.localTransformMatrix),
    matrix.ORIGIN
  );
  const oldAngle = Math.atan2(centerPosition[1] - vector[1], centerPosition[0] - vector[0]);
  const newAngle = Math.atan2(centerPosition[1] - y, centerPosition[0] - x);
  const closest45deg = (Math.round(newAngle / (Math.PI / 4)) * Math.PI) / 4;
  const radius = Math.sqrt(Math.pow(centerPosition[0] - x, 2) + Math.pow(centerPosition[1] - y, 2));
  const closest45degPosition = [Math.cos(closest45deg) * radius, Math.sin(closest45deg) * radius];
  const pixelDifference = Math.sqrt(
    Math.pow(closest45degPosition[0] - (centerPosition[0] - x), 2) +
      Math.pow(closest45degPosition[1] - (centerPosition[1] - y), 2)
  );
  const relaxed = alterSnapGesture.indexOf('relax') !== -1;
  const newSnappedAngle =
    pixelDifference < config.rotateSnapInPixels && !relaxed ? closest45deg : newAngle;
  const result = matrix.rotateZ(oldAngle - newSnappedAngle);
  return { transforms: [result], shapes: [shape.id] };
};

/* upcoming functionality
const centeredScaleManipulation = ({ shape, directShape, cursorPosition: { x, y } }) => {
  // scaling such that the center remains in place (ie. the other side of the shape can grow/shrink)
  if (!shape || !directShape) return { transforms: [], shapes: [] };
  const center = shape.transformMatrix;
  const vector = matrix.mvMultiply(
    matrix.multiply(center, directShape.localTransformMatrix),
    matrix.ORIGIN
  );
  const shapeCenter = matrix.mvMultiply(center, matrix.ORIGIN);
  const horizontalRatio =
    directShape.horizontalPosition === 'center'
      ? 1
      : Math.max(0.5, (x - shapeCenter[0]) / (vector[0] - shapeCenter[0]));
  const verticalRatio =
    directShape.verticalPosition === 'center'
      ? 1
      : Math.max(0.5, (y - shapeCenter[1]) / (vector[1] - shapeCenter[1]));
  const result = matrix.scale(horizontalRatio, verticalRatio, 1);
  return { transforms: [result], shapes: [shape.id] };
};
*/

const resizeMultiplierHorizontal = { left: -1, center: 0, right: 1 };
const resizeMultiplierVertical = { top: -1, center: 0, bottom: 1 };
const xNames = { '-1': 'left', '0': 'center', '1': 'right' };
const yNames = { '-1': 'top', '0': 'center', '1': 'bottom' };

const minimumSize = ({ a, b, baseAB }, vector) => {
  // don't allow an element size of less than the minimumElementSize
  // todo switch to matrix algebra
  const min = config.minimumElementSize;
  return [
    Math.max(baseAB ? min - baseAB[0] : min - a, vector[0]),
    Math.max(baseAB ? min - baseAB[1] : min - b, vector[1]),
  ];
};

const centeredResizeManipulation = ({ gesture, shape, directShape }) => {
  const transform = gesture.cumulativeTransform;
  // scaling such that the center remains in place (ie. the other side of the shape can grow/shrink)
  if (!shape || !directShape) return { transforms: [], shapes: [] };
  // transform the incoming `transform` so that resizing is aligned with shape orientation
  const vector = matrix.mvMultiply(
    matrix.multiply(
      matrix.invert(matrix.compositeComponent(shape.localTransformMatrix)), // rid the translate component
      transform
    ),
    matrix.ORIGIN
  );
  const orientationMask = [
    resizeMultiplierHorizontal[directShape.horizontalPosition],
    resizeMultiplierVertical[directShape.verticalPosition],
    0,
  ];
  const orientedVector = matrix2d.componentProduct(vector, orientationMask);
  const cappedOrientedVector = minimumSize(shape, orientedVector);
  return {
    cumulativeTransforms: [],
    cumulativeSizes: [gesture.sizes || matrix2d.translate(...cappedOrientedVector)],
    shapes: [shape.id],
  };
};

const asymmetricResizeManipulation = ({ gesture, shape, directShape }) => {
  const transform = gesture.cumulativeTransform;
  // scaling such that the center remains in place (ie. the other side of the shape can grow/shrink)
  if (!shape || !directShape) return { transforms: [], shapes: [] };
  // transform the incoming `transform` so that resizing is aligned with shape orientation
  const compositeComponent = matrix.compositeComponent(shape.localTransformMatrix);
  const inv = matrix.invert(compositeComponent); // rid the translate component
  const vector = matrix.mvMultiply(matrix.multiply(inv, transform), matrix.ORIGIN);
  const orientationMask = [
    resizeMultiplierHorizontal[directShape.horizontalPosition] / 2,
    resizeMultiplierVertical[directShape.verticalPosition] / 2,
    0,
  ];
  const orientedVector = matrix2d.componentProduct(vector, orientationMask);
  const cappedOrientedVector = minimumSize(shape, orientedVector);

  const antiRotatedVector = matrix.mvMultiply(
    matrix.multiply(
      compositeComponent,
      matrix.scale(
        resizeMultiplierHorizontal[directShape.horizontalPosition],
        resizeMultiplierVertical[directShape.verticalPosition],
        1
      ),
      matrix.translate(cappedOrientedVector[0], cappedOrientedVector[1], 0)
    ),
    matrix.ORIGIN
  );
  const sizeMatrix = gesture.sizes || matrix2d.translate(...cappedOrientedVector);
  return {
    cumulativeTransforms: [matrix.translate(antiRotatedVector[0], antiRotatedVector[1], 0)],
    cumulativeSizes: [sizeMatrix],
    shapes: [shape.id],
  };
};

const directShapeTranslateManipulation = (cumulativeTransforms, directShapes) => {
  const shapes = directShapes
    .map(shape => shape.type !== 'annotation' && shape.id)
    .filter(identity);
  return [{ cumulativeTransforms, shapes }];
};

const rotationAnnotationManipulation = (
  directTransforms,
  directShapes,
  allShapes,
  cursorPosition,
  alterSnapGesture
) => {
  const shapeIds = directShapes.map(
    shape =>
      shape.type === 'annotation' && shape.subtype === config.rotationHandleName && shape.parent
  );
  const shapes = shapeIds.map(id => id && allShapes.find(shape => shape.id === id));
  const tuples = flatten(
    shapes.map((shape, i) =>
      directTransforms.map(transform => ({
        transform,
        shape,
        directShape: directShapes[i],
        cursorPosition,
        alterSnapGesture,
      }))
    )
  );
  return tuples.map(rotationManipulation);
};

const resizeAnnotationManipulation = (transformGestures, directShapes, allShapes, manipulator) => {
  const shapeIds = directShapes.map(
    shape =>
      shape.type === 'annotation' && shape.subtype === config.resizeHandleName && shape.parent
  );
  const shapes = shapeIds.map(id => id && allShapes.find(shape => shape.id === id));
  const tuples = flatten(
    shapes.map((shape, i) =>
      transformGestures.map(gesture => ({ gesture, shape, directShape: directShapes[i] }))
    )
  );
  return tuples.map(manipulator);
};

const symmetricManipulation = optionHeld; // as in comparable software applications, todo: make configurable

const resizeManipulator = select(
  toggle => (toggle ? centeredResizeManipulation : asymmetricResizeManipulation)
)(symmetricManipulation);

const transformIntents = select(
  (transformGestures, directShapes, shapes, cursorPosition, alterSnapGesture, manipulator) => [
    ...directShapeTranslateManipulation(
      transformGestures.map(g => g.cumulativeTransform),
      directShapes
    ),
    ...rotationAnnotationManipulation(
      transformGestures.map(g => g.transform),
      directShapes,
      shapes,
      cursorPosition,
      alterSnapGesture
    ),
    ...resizeAnnotationManipulation(transformGestures, directShapes, shapes, manipulator),
  ]
)(transformGestures, selectedShapes, shapes, cursorPosition, alterSnapGesture, resizeManipulator);

const fromScreen = currentTransform => transform => {
  const isTranslate = transform[12] !== 0 || transform[13] !== 0;
  if (isTranslate) {
    const composite = matrix.compositeComponent(currentTransform);
    const inverse = matrix.invert(composite);
    const result = matrix.translateComponent(matrix.multiply(inverse, transform));
    return result;
  } else {
    return transform;
  }
};

// "cumulative" is the effect of the ongoing interaction; "baseline" is sans "cumulative", plain "localTransformMatrix"
// is the composition of the baseline (previously absorbed transforms) and the cumulative (ie. ongoing interaction)
const shapeApplyLocalTransforms = intents => shape => {
  const transformIntents = flatten(
    intents
      .map(
        intent =>
          intent.transforms &&
          intent.transforms.length &&
          intent.shapes.find(id => id === shape.id) &&
          intent.transforms.map(fromScreen(shape.localTransformMatrix))
      )
      .filter(identity)
  );
  const sizeIntents = flatten(
    intents
      .map(
        intent =>
          intent.sizes &&
          intent.sizes.length &&
          intent.shapes.find(id => id === shape.id) &&
          intent.sizes
      )
      .filter(identity)
  );
  const cumulativeTransformIntents = flatten(
    intents
      .map(
        intent =>
          intent.cumulativeTransforms &&
          intent.cumulativeTransforms.length &&
          intent.shapes.find(id => id === shape.id) &&
          intent.cumulativeTransforms.map(fromScreen(shape.localTransformMatrix))
      )
      .filter(identity)
  );
  const cumulativeSizeIntents = flatten(
    intents
      .map(
        intent =>
          intent.cumulativeSizes &&
          intent.cumulativeSizes.length &&
          intent.shapes.find(id => id === shape.id) &&
          intent.cumulativeSizes
      )
      .filter(identity)
  );

  const baselineLocalTransformMatrix = matrix.multiply(
    shape.baselineLocalTransformMatrix || shape.localTransformMatrix,
    ...transformIntents
  );
  const cumulativeTransformIntentMatrix = matrix.multiply(...cumulativeTransformIntents);
  const baselineSizeMatrix = matrix2d.multiply(...sizeIntents) || matrix2d.UNITMATRIX;
  const localTransformMatrix = cumulativeTransformIntents.length
    ? matrix.multiply(baselineLocalTransformMatrix, cumulativeTransformIntentMatrix)
    : baselineLocalTransformMatrix;

  const cumulativeSizeIntentMatrix = matrix2d.multiply(...cumulativeSizeIntents);
  const sizeVector = matrix2d.mvMultiply(
    cumulativeSizeIntents.length
      ? matrix2d.multiply(baselineSizeMatrix, cumulativeSizeIntentMatrix)
      : baselineSizeMatrix,
    shape.baseAB ? [...shape.baseAB, 1] : [shape.a, shape.b, 1]
  );

  // Absorb changes if the gesture has ended
  const absorbChanges =
    !transformIntents.length &&
    !sizeIntents.length &&
    !cumulativeTransformIntents.length &&
    !cumulativeSizeIntents.length;

  return {
    // update the preexisting shape:
    ...shape,
    // apply transforms:
    baselineLocalTransformMatrix: absorbChanges ? null : baselineLocalTransformMatrix,
    baselineSizeMatrix: absorbChanges ? null : baselineSizeMatrix,
    localTransformMatrix: absorbChanges ? shape.localTransformMatrix : localTransformMatrix,
    a: absorbChanges ? shape.a : sizeVector[0],
    b: absorbChanges ? shape.b : sizeVector[1],
    baseAB: absorbChanges ? null : shape.baseAB || [shape.a, shape.b],
  };
};

const applyLocalTransforms = (shapes, transformIntents) => {
  return shapes.map(shapeApplyLocalTransforms(transformIntents));
};

const getUpstreamTransforms = (shapes, shape) =>
  shape.parent
    ? getUpstreamTransforms(shapes, shapes.find(s => s.id === shape.parent)).concat([
        shape.localTransformMatrix,
      ])
    : [shape.localTransformMatrix];

const getUpstreams = (shapes, shape) =>
  shape.parent
    ? getUpstreams(shapes, shapes.find(s => s.id === shape.parent)).concat([shape])
    : [shape];

const snappedA = shape => shape.a + (shape.snapResizeVector ? shape.snapResizeVector[0] : 0);
const snappedB = shape => shape.b + (shape.snapResizeVector ? shape.snapResizeVector[1] : 0);

const cascadeTransforms = (shapes, shape) => {
  const upstreams = getUpstreams(shapes, shape);
  const upstreamTransforms = upstreams.map(shape => {
    return shape.snapDeltaMatrix
      ? matrix.multiply(shape.localTransformMatrix, shape.snapDeltaMatrix)
      : shape.localTransformMatrix;
  });
  const cascadedTransforms = matrix.reduceTransforms(upstreamTransforms);
  return cascadedTransforms;
};

const shapeCascadeProperties = shapes => shape => {
  return {
    ...shape,
    transformMatrix: cascadeTransforms(shapes, shape),
    width: 2 * snappedA(shape),
    height: 2 * snappedB(shape),
  };
};

const cascadeProperties = shapes => shapes.map(shapeCascadeProperties(shapes));

const nextShapes = select((preexistingShapes, restated) => {
  if (restated && restated.newShapes) return restated.newShapes;

  // this is the per-shape model update at the current PoC level
  return preexistingShapes;
})(shapes, restateShapesEvent);

const transformedShapes = select(applyLocalTransforms)(nextShapes, transformIntents);

const alignmentGuides = (shapes, guidedShapes, draggedShape) => {
  const result = {};
  let counter = 0;
  const extremeHorizontal = resizeMultiplierHorizontal[draggedShape.horizontalPosition];
  const extremeVertical = resizeMultiplierVertical[draggedShape.verticalPosition];
  // todo replace for loops with [].map calls; DRY it up, break out parts; several of which to move to geometry.js
  // todo switch to informative variable names
  for (let i = 0; i < guidedShapes.length; i++) {
    const d = guidedShapes[i];
    if (d.type === 'annotation') continue; // fixme avoid this by not letting annotations get in here
    // key points of the dragged shape bounding box
    for (let j = 0; j < shapes.length; j++) {
      const s = shapes[j];
      if (d.id === s.id) continue; // don't self-constrain; todo in the future, self-constrain to the original location
      if (s.type === 'annotation') continue; // fixme avoid this by not letting annotations get in here
      if (s.parent) continue; // for now, don't snap to grouped elements fixme could snap, but make sure transform is gloabl
      // key points of the stationery shape
      for (let k = -1; k < 2; k++) {
        for (let l = -1; l < 2; l++) {
          if ((k && !l) || (!k && l)) continue; // don't worry about midpoints of the edges, only the center
          if (
            draggedShape.subtype === config.resizeHandleName &&
            !(
              (extremeHorizontal === k && extremeVertical === l) || // moved corner
              // moved midpoint on horizontal border
              (extremeHorizontal === 0 && k !== 0 && extremeVertical === l) ||
              // moved midpoint on vertical border
              (extremeVertical === 0 && l !== 0 && extremeHorizontal === k)
            )
          )
            continue;
          const D = landmarkPoint(d, k, l);
          for (let m = -1; m < 2; m++) {
            for (let n = -1; n < 2; n++) {
              if ((m && !n) || (!m && n)) continue; // don't worry about midpoints of the edges, only the center
              const S = landmarkPoint(s, m, n);
              for (let dim = 0; dim < 2; dim++) {
                const orthogonalDimension = 1 - dim;
                const dd = D[dim];
                const ss = S[dim];
                const key = k + '|' + l + '|' + dim;
                const signedDistance = dd - ss;
                const distance = Math.abs(signedDistance);
                const currentClosest = result[key];
                if (
                  Math.round(distance) <= config.guideDistance &&
                  (!currentClosest || distance <= currentClosest.distance)
                ) {
                  const orthogonalValues = [
                    D[orthogonalDimension],
                    S[orthogonalDimension],
                    ...(currentClosest ? [currentClosest.lowPoint, currentClosest.highPoint] : []),
                  ];
                  const lowPoint = Math.min(...orthogonalValues);
                  const highPoint = Math.max(...orthogonalValues);
                  const midPoint = (lowPoint + highPoint) / 2;
                  const radius = midPoint - lowPoint;
                  result[key] = {
                    id: counter++,
                    localTransformMatrix: matrix.translate(
                      dim ? midPoint : ss,
                      dim ? ss : midPoint,
                      config.atopZ
                    ),
                    a: dim ? radius : 0.5,
                    b: dim ? 0.5 : radius,
                    lowPoint,
                    highPoint,
                    distance,
                    signedDistance,
                    dimension: dim ? 'vertical' : 'horizontal',
                    constrained: d.id,
                    constrainer: s.id,
                  };
                }
              }
            }
          }
        }
      }
    }
  }
  return Object.values(result);
};

const isHorizontal = constraint => constraint.dimension === 'horizontal';
const isVertical = constraint => constraint.dimension === 'vertical';

const closestConstraint = (prev = { distance: Infinity }, next) =>
  next.distance < prev.distance ? { constraint: next, distance: next.distance } : prev;

const directionalConstraint = (constraints, filterFun) => {
  const directionalConstraints = constraints.filter(filterFun);
  const closest = directionalConstraints.reduce(closestConstraint, undefined);
  return closest && closest.constraint;
};

const draggedPrimaryShape = select(
  (shapes, draggedShape) =>
    draggedShape && shapes.find(shape => shape.id === primaryShape(draggedShape))
)(shapes, draggedShape);

const alignmentGuideAnnotations = select((shapes, draggedPrimaryShape, draggedShape) => {
  const guidedShapes = draggedPrimaryShape
    ? [shapes.find(s => s.id === draggedPrimaryShape.id)].filter(identity)
    : [];
  return guidedShapes.length
    ? alignmentGuides(shapes, guidedShapes, draggedShape).map(shape => ({
        ...shape,
        id: config.alignmentGuideName + '_' + shape.id,
        type: 'annotation',
        subtype: config.alignmentGuideName,
        interactive: false,
        backgroundColor: 'magenta',
      }))
    : [];
})(transformedShapes, draggedPrimaryShape, draggedShape);

const hoverAnnotations = select((hoveredShape, selectedPrimaryShapeIds, draggedShape) => {
  return hoveredShape &&
    hoveredShape.type !== 'annotation' &&
    selectedPrimaryShapeIds.indexOf(hoveredShape.id) === -1 &&
    !draggedShape
    ? [
        {
          ...hoveredShape,
          id: config.hoverAnnotationName + '_' + hoveredShape.id,
          type: 'annotation',
          subtype: config.hoverAnnotationName,
          interactive: false,
          localTransformMatrix: matrix.multiply(
            hoveredShape.localTransformMatrix,
            matrix.translate(0, 0, 100)
          ),
        },
      ]
    : [];
})(hoveredShape, selectedPrimaryShapeIds, draggedShape);

const rotationAnnotation = (shapes, selectedShapes, shape, i) => {
  const foundShape = shapes.find(s => shape.id === s.id);
  if (!foundShape) return false;

  if (foundShape.type === 'annotation') {
    return rotationAnnotation(
      shapes,
      selectedShapes,
      shapes.find(s => foundShape.parent === s.id),
      i
    );
  }
  const b = snappedB(foundShape);
  const centerTop = matrix.translate(0, -b, 0);
  const pixelOffset = matrix.translate(0, -config.rotateAnnotationOffset, config.atopZ);
  const transform = matrix.multiply(centerTop, pixelOffset);
  return {
    id: config.rotationHandleName + '_' + i,
    type: 'annotation',
    subtype: config.rotationHandleName,
    interactive: true,
    parent: foundShape.id,
    localTransformMatrix: transform,
    backgroundColor: 'rgb(0,0,255,0.3)',
    a: config.rotationHandleSize,
    b: config.rotationHandleSize,
  };
};

const resizePointAnnotations = (parent, a, b) => ([x, y, cursorAngle]) => {
  const markerPlace = matrix.translate(x * a, y * b, config.resizeAnnotationOffsetZ);
  const pixelOffset = matrix.translate(
    -x * config.resizeAnnotationOffset,
    -y * config.resizeAnnotationOffset,
    config.atopZ + 10
  );
  const transform = matrix.multiply(markerPlace, pixelOffset);
  const xName = xNames[x];
  const yName = yNames[y];
  return {
    id: [config.resizeHandleName, xName, yName, parent].join('_'),
    type: 'annotation',
    subtype: config.resizeHandleName,
    horizontalPosition: xName,
    verticalPosition: yName,
    cursorAngle,
    interactive: true,
    parent,
    localTransformMatrix: transform,
    backgroundColor: 'rgb(0,255,0,1)',
    a: config.resizeAnnotationSize,
    b: config.resizeAnnotationSize,
  };
};

const resizeEdgeAnnotations = (parent, a, b) => ([[x0, y0], [x1, y1]]) => {
  const x = a * mean(x0, x1);
  const y = b * mean(y0, y1);
  const markerPlace = matrix.translate(x, y, config.atopZ - 10);
  const transform = markerPlace; // no offset etc. at the moment
  const horizontal = y0 === y1;
  const length = horizontal ? a * Math.abs(x1 - x0) : b * Math.abs(y1 - y0);
  const sectionHalfLength = Math.max(0, length / 2 - config.resizeAnnotationConnectorOffset);
  const width = 0.5;
  return {
    id: [config.resizeConnectorName, xNames[x0], yNames[y0], xNames[x1], yNames[y1], parent].join(
      '_'
    ),
    type: 'annotation',
    subtype: config.resizeConnectorName,
    interactive: true,
    parent,
    localTransformMatrix: transform,
    backgroundColor: config.devColor,
    a: horizontal ? sectionHalfLength : width,
    b: horizontal ? width : sectionHalfLength,
  };
};

const connectorVertices = [
  [[-1, -1], [0, -1]],
  [[0, -1], [1, -1]],
  [[1, -1], [1, 0]],
  [[1, 0], [1, 1]],
  [[1, 1], [0, 1]],
  [[0, 1], [-1, 1]],
  [[-1, 1], [-1, 0]],
  [[-1, 0], [-1, -1]],
];

const cornerVertices = [[-1, -1], [1, -1], [-1, 1], [1, 1]];

function resizeAnnotation(shapes, selectedShapes, shape) {
  const foundShape = shapes.find(s => shape.id === s.id);
  const properShape =
    foundShape &&
    (foundShape.subtype === config.resizeHandleName
      ? shapes.find(s => shape.parent === s.id)
      : foundShape);
  if (!foundShape) return [];

  if (foundShape.subtype === config.resizeHandleName) {
    // preserve any interactive annotation when handling
    const result = foundShape.interactive
      ? resizeAnnotationsFunction({
          shapes,
          selectedShapes: [shapes.find(s => shape.parent === s.id)],
        })
      : [];
    return result;
  }
  if (foundShape.type === 'annotation')
    return resizeAnnotation(shapes, selectedShapes, shapes.find(s => foundShape.parent === s.id));

  // fixme left active: snap wobble. right active: opposite side wobble.
  const a = snappedA(properShape);
  const b = snappedB(properShape);
  const groupedShape = shape =>
    shape.parent === properShape.id &&
    shape.type !== 'annotation' &&
    shape.subtype !== config.adHocGroupName;
  // fixme broaden resizableChild to other multiples of 90 degrees
  const resizableChild = shape =>
    shallowEqual(
      matrix.compositeComponent(shape.localTransformMatrix).map(applyTolerance),
      matrix.UNITMATRIX
    );
  const allowResize =
    properShape.type !== 'group' ||
    (config.groupResize && shapes.filter(groupedShape).every(resizableChild));
  const resizeVertices = allowResize
    ? [
        [-1, -1, 315],
        [1, -1, 45],
        [1, 1, 135],
        [-1, 1, 225], // corners
        [0, -1, 0],
        [1, 0, 90],
        [0, 1, 180],
        [-1, 0, 270], // edge midpoints
      ]
    : [];
  const resizePoints = resizeVertices.map(resizePointAnnotations(shape.id, a, b));
  const connectors = connectorVertices.map(resizeEdgeAnnotations(shape.id, a, b));
  return [...resizePoints, ...connectors];
}

function resizeAnnotationsFunction({ shapes, selectedShapes }) {
  const shapesToAnnotate = selectedShapes;
  return flatten(
    shapesToAnnotate
      .map(shape => {
        return resizeAnnotation(shapes, selectedShapes, shape);
      })
      .filter(identity)
  );
}

// Once the interaction is over, ensure that the shape stays put where the constraint led it - distance is no longer relevant
// Note that this is what standard software (Adobe Illustrator, Google Slides, PowerPoint, Sketch etc.) do, but it's in
// stark contrast with the concept of StickyLines - whose central idea is that constraints remain applied until explicitly
// broken.
const crystallizeConstraint = shape => {
  const result = { ...shape };
  if (shape.snapDeltaMatrix) {
    result.localTransformMatrix = matrix.multiply(
      shape.localTransformMatrix,
      shape.snapDeltaMatrix
    );
    result.snapDeltaMatrix = null;
  }
  if (shape.snapResizeVector) {
    result.a = snappedA(shape);
    result.b = snappedB(shape);
    result.snapResizeVector = null;
  }
  return result;
};

const translateShapeSnap = (horizontalConstraint, verticalConstraint, draggedElement) => shape => {
  const constrainedX = horizontalConstraint && horizontalConstraint.constrained === shape.id;
  const constrainedY = verticalConstraint && verticalConstraint.constrained === shape.id;
  const snapOffsetX = constrainedX ? -horizontalConstraint.signedDistance : 0;
  const snapOffsetY = constrainedY ? -verticalConstraint.signedDistance : 0;
  if (constrainedX || constrainedY) {
    if (!snapOffsetX && !snapOffsetY) return shape;
    const snapOffset = matrix.translateComponent(
      matrix.multiply(
        matrix.rotateZ((matrix.matrixToAngle(draggedElement.localTransformMatrix) / 180) * Math.PI),
        matrix.translate(snapOffsetX, snapOffsetY, 0)
      )
    );
    return {
      ...shape,
      snapDeltaMatrix: snapOffset,
    };
  } else if (shape.snapDeltaMatrix || shape.snapResizeVector) {
    return crystallizeConstraint(shape);
  } else {
    return shape;
  }
};

const resizeShapeSnap = (
  horizontalConstraint,
  verticalConstraint,
  draggedElement,
  symmetric,
  horizontalPosition,
  verticalPosition
) => shape => {
  const constrainedShape = draggedElement && shape.id === draggedElement.id;
  const constrainedX = horizontalConstraint && horizontalConstraint.constrained === shape.id;
  const constrainedY = verticalConstraint && verticalConstraint.constrained === shape.id;
  const snapOffsetX = constrainedX ? horizontalConstraint.signedDistance : 0;
  const snapOffsetY = constrainedY ? -verticalConstraint.signedDistance : 0;
  if (constrainedX || constrainedY) {
    const multiplier = symmetric ? 1 : 0.5;
    const angle = (matrix.matrixToAngle(draggedElement.localTransformMatrix) / 180) * Math.PI;
    const horizontalSign = -resizeMultiplierHorizontal[horizontalPosition]; // fixme unify sign
    const verticalSign = resizeMultiplierVertical[verticalPosition];
    // todo turn it into matrix algebra via matrix2d.js
    const sin = Math.sin(angle);
    const cos = Math.cos(angle);
    const snapOffsetA = horizontalSign * (cos * snapOffsetX - sin * snapOffsetY);
    const snapOffsetB = verticalSign * (sin * snapOffsetX + cos * snapOffsetY);
    const snapTranslateOffset = matrix.translateComponent(
      matrix.multiply(
        matrix.rotateZ(angle),
        matrix.translate((1 - multiplier) * -snapOffsetX, (1 - multiplier) * snapOffsetY, 0)
      )
    );
    const snapSizeOffset = [multiplier * snapOffsetA, multiplier * snapOffsetB];
    return {
      ...shape,
      snapDeltaMatrix: snapTranslateOffset,
      snapResizeVector: snapSizeOffset,
    };
  } else if (constrainedShape) {
    return {
      ...shape,
      snapDeltaMatrix: null,
      snapResizeVector: null,
    };
  } else {
    return crystallizeConstraint(shape);
  }
};

const snappedShapes = select(
  (
    shapes,
    draggedShape,
    draggedElement,
    alignmentGuideAnnotations,
    alterSnapGesture,
    symmetricManipulation
  ) => {
    const contentShapes = shapes.filter(shape => shape.type !== 'annotation');
    const subtype = draggedShape && draggedShape.subtype;
    // snapping doesn't come into play if there's no dragging, or it's not a resize drag or translate drag on a
    // leaf element or a group element:
    if (subtype && [config.resizeHandleName, config.adHocGroupName].indexOf(subtype) === -1)
      return contentShapes;
    const constraints = alignmentGuideAnnotations; // fixme split concept of snap constraints and their annotations
    const relaxed = alterSnapGesture.indexOf('relax') !== -1;
    const constrained = config.snapConstraint && !relaxed;
    const horizontalConstraint = constrained && directionalConstraint(constraints, isHorizontal);
    const verticalConstraint = constrained && directionalConstraint(constraints, isVertical);
    const snapper =
      subtype === config.resizeHandleName
        ? resizeShapeSnap(
            horizontalConstraint,
            verticalConstraint,
            draggedElement,
            symmetricManipulation,
            draggedShape.horizontalPosition,
            draggedShape.verticalPosition
          )
        : translateShapeSnap(horizontalConstraint, verticalConstraint, draggedElement); // leaf element or ad-hoc group
    return contentShapes.map(snapper);
  }
)(
  transformedShapes,
  draggedShape,
  draggedPrimaryShape,
  alignmentGuideAnnotations,
  alterSnapGesture,
  symmetricManipulation
);

const constrainedShapesWithPreexistingAnnotations = select((snapped, transformed) =>
  snapped.concat(transformed.filter(s => s.type === 'annotation'))
)(snappedShapes, transformedShapes);

const extend = ([[xMin, yMin], [xMax, yMax]], [x0, y0], [x1, y1]) => [
  [Math.min(xMin, x0, x1), Math.min(yMin, y0, y1)],
  [Math.max(xMax, x0, x1), Math.max(yMax, y0, y1)],
];

const isAdHocGroup = shape =>
  shape.type === config.groupName && shape.subtype === config.adHocGroupName;

// fixme put it into geometry.js
const getAABB = shapes =>
  shapes.reduce(
    (prev, shape) => {
      const shapeBounds = cornerVertices.reduce((prev, xyVertex) => {
        const cornerPoint = matrix.normalize(
          matrix.mvMultiply(shape.transformMatrix, [
            shape.a * xyVertex[0],
            shape.b * xyVertex[1],
            0,
            1,
          ])
        );
        return extend(prev, cornerPoint, cornerPoint);
      }, prev);
      return extend(prev, ...shapeBounds);
    },
    [[Infinity, Infinity], [-Infinity, -Infinity]]
  );

const projectAABB = ([[xMin, yMin], [xMax, yMax]]) => {
  const a = (xMax - xMin) / 2;
  const b = (yMax - yMin) / 2;
  const xTranslate = xMin + a;
  const yTranslate = yMin + b;
  const zTranslate = 0; // todo fix hack that ensures that grouped elements continue to be selectable
  const localTransformMatrix = matrix.translate(xTranslate, yTranslate, zTranslate);
  const rigTransform = matrix.translate(-xTranslate, -yTranslate, -zTranslate);
  return { a, b, localTransformMatrix, rigTransform };
};

const dissolveGroups = (preexistingAdHocGroups, shapes, selectedShapes) => {
  return {
    shapes: shapes.filter(shape => !isAdHocGroup(shape)).map(shape => {
      const preexistingAdHocGroupParent = preexistingAdHocGroups.find(
        groupShape => groupShape.id === shape.parent
      );
      // if linked, dissociate from ad hoc group parent
      return preexistingAdHocGroupParent
        ? {
            ...shape,
            parent: null,
            localTransformMatrix: matrix.multiply(
              preexistingAdHocGroupParent.localTransformMatrix, // reinstate the group offset onto the child
              shape.localTransformMatrix
            ),
          }
        : shape;
    }),
    selectedShapes,
  };
};

// returns true if the shape is not a child of one of the shapes
const hasNoParentWithin = shapes => shape => !shapes.some(g => shape.parent === g.id);

const childOfAdHocGroup = shape => shape.parent && shape.parent.startsWith(config.adHocGroupName);

const isOrBelongsToAdHocGroup = shape => isAdHocGroup(shape) || childOfAdHocGroup(shape);

const asYetUngroupedShapes = (preexistingAdHocGroups, selectedShapes) =>
  selectedShapes.filter(hasNoParentWithin(preexistingAdHocGroups));

const idMatch = shape => s => s.id === shape.id;
const idsMatch = selectedShapes => shape => selectedShapes.find(idMatch(shape));

const axisAlignedBoundingBoxShape = shapesToBox => {
  const axisAlignedBoundingBox = getAABB(shapesToBox);
  const { a, b, localTransformMatrix, rigTransform } = projectAABB(axisAlignedBoundingBox);
  const id = config.adHocGroupName + '_' + makeUid();
  const aabbShape = {
    id,
    type: config.groupName,
    subtype: config.adHocGroupName,
    a,
    b,
    localTransformMatrix,
    rigTransform,
  };
  return aabbShape;
};

const resizeGroup = (shapes, selectedShapes, elements) => {
  if (!elements.length) return { shapes, selectedShapes };
  const e = elements[0];
  if (e.subtype !== 'adHocGroup') return { shapes, selectedShapes };
  if (!e.baseAB) {
    return {
      shapes: shapes.map(s => ({ ...s, childBaseAB: null, baseLocalTransformMatrix: null })),
      selectedShapes,
    };
  }
  const groupScaleX = e.a / e.baseAB[0];
  const groupScaleY = e.b / e.baseAB[1];
  const groupScale = matrix.scale(groupScaleX, groupScaleY, 1);
  return {
    shapes: shapes.map(s => {
      if (s.parent !== e.id || s.type === 'annotation') return s;
      const childBaseAB = s.childBaseAB || [s.a, s.b];
      const impliedScale = matrix.scale(...childBaseAB, 1);
      const inverseImpliedScale = matrix.invert(impliedScale);
      const baseLocalTransformMatrix = s.baseLocalTransformMatrix || s.localTransformMatrix;
      const normalizedBaseLocalTransformMatrix = matrix.multiply(
        baseLocalTransformMatrix,
        impliedScale
      );
      const T = matrix.multiply(groupScale, normalizedBaseLocalTransformMatrix);
      const backScaler = groupScale.map(d => Math.abs(d));
      const transformShit = matrix.invert(backScaler);
      const abTuple = matrix.mvMultiply(matrix.multiply(backScaler, impliedScale), [1, 1, 1, 1]);
      return {
        ...s,
        localTransformMatrix: matrix.multiply(
          T,
          matrix.multiply(inverseImpliedScale, transformShit)
        ),
        a: abTuple[0],
        b: abTuple[1],
        childBaseAB,
        baseLocalTransformMatrix,
      };
    }),
    selectedShapes,
  };
};

const getLeafs = (descendCondition, allShapes, shapes) =>
  removeDuplicates(
    s => s.id,
    flatten(
      shapes.map(
        shape => (descendCondition(shape) ? allShapes.filter(s => s.parent === shape.id) : shape)
      )
    )
  );

const grouping = select((shapes, selectedShapes) => {
  const preexistingAdHocGroups = shapes.filter(isAdHocGroup);
  const matcher = idsMatch(selectedShapes);
  const selectedFn = shape => matcher(shape) && shape.type !== 'annotation';
  const freshSelectedShapes = shapes.filter(selectedFn);
  const freshNonSelectedShapes = shapes.filter(not(selectedFn));
  const someSelectedShapesAreGrouped = selectedShapes.some(isOrBelongsToAdHocGroup);
  const selectionOutsideGroup = !someSelectedShapesAreGrouped;

  // ad hoc groups must dissolve if 1. the user clicks away, 2. has a selection that's not the group, or 3. selected something else
  if (preexistingAdHocGroups.length && selectionOutsideGroup) {
    // asYetUngroupedShapes will trivially be the empty set if case 1 is realized: user clicks aside -> selectedShapes === []
    return dissolveGroups(
      preexistingAdHocGroups,
      shapes,
      asYetUngroupedShapes(preexistingAdHocGroups, freshSelectedShapes)
    );
  }

  // preserve the current selection if the sole ad hoc group is being manipulated
  const elements = contentShapes(shapes, selectedShapes);
  if (selectedShapes.length === 1 && elements[0].subtype === 'adHocGroup') {
    return config.groupResize
      ? resizeGroup(shapes, selectedShapes, elements)
      : { shapes, selectedShapes };
  }
  // group items or extend group bounding box (if enabled)
  if (selectedShapes.length < 2) {
    // resize the group if needed (ad-hoc group resize is manipulated)
    return { shapes, selectedShapes };
  } else {
    // group together the multiple items
    const group = axisAlignedBoundingBoxShape(freshSelectedShapes);
    const selectedLeafShapes = getLeafs(
      shape => shape.subtype === config.adHocGroupName,
      shapes,
      freshSelectedShapes
    );
    const parentedSelectedShapes = selectedLeafShapes.map(shape => ({
      ...shape,
      parent: group.id,
      localTransformMatrix: matrix.multiply(group.rigTransform, shape.transformMatrix),
    }));
    const nonGroupGraphConstituent = s =>
      s.subtype !== config.adHocGroupName && !parentedSelectedShapes.find(ss => s.id === ss.id);
    const dissociateFromParentIfAny = s =>
      s.parent && s.parent.startsWith(config.adHocGroupName) ? { ...s, parent: null } : s;
    const allTerminalShapes = parentedSelectedShapes.concat(
      freshNonSelectedShapes.filter(nonGroupGraphConstituent).map(dissociateFromParentIfAny)
    );
    return {
      shapes: allTerminalShapes.concat([group]),
      selectedShapes: [group],
    };
  }
})(constrainedShapesWithPreexistingAnnotations, selectedShapes);

const groupedSelectedShapes = select(({ selectedShapes }) => selectedShapes)(grouping);

const groupedSelectedShapeIds = select(selectedShapes => selectedShapes.map(shape => shape.id))(
  groupedSelectedShapes
);

const groupedSelectedPrimaryShapeIds = select(selectedShapes => selectedShapes.map(primaryShape))(
  groupedSelectedShapes
);

const resizeAnnotations = select(resizeAnnotationsFunction)(grouping);

const rotationAnnotations = select(({ shapes, selectedShapes }) => {
  const shapesToAnnotate = selectedShapes;
  return shapesToAnnotate
    .map((shape, i) => rotationAnnotation(shapes, selectedShapes, shape, i))
    .filter(identity);
})(grouping);

const annotatedShapes = select(
  (
    { shapes },
    alignmentGuideAnnotations,
    hoverAnnotations,
    rotationAnnotations,
    resizeAnnotations
  ) => {
    const annotations = [].concat(
      alignmentGuideAnnotations,
      hoverAnnotations,
      rotationAnnotations,
      resizeAnnotations
    );
    // remove preexisting annotations
    const contentShapes = shapes.filter(shape => shape.type !== 'annotation');
    return contentShapes.concat(annotations); // add current annotations
  }
)(grouping, alignmentGuideAnnotations, hoverAnnotations, rotationAnnotations, resizeAnnotations);

const globalTransformShapes = select(cascadeProperties)(annotatedShapes);

const bidirectionalCursors = {
  '0': 'ns-resize',
  '45': 'nesw-resize',
  '90': 'ew-resize',
  '135': 'nwse-resize',
  '180': 'ns-resize',
  '225': 'nesw-resize',
  '270': 'ew-resize',
  '315': 'nwse-resize',
};

const cursor = select((shape, draggedPrimaryShape) => {
  if (!shape) return 'auto';
  switch (shape.subtype) {
    case config.rotationHandleName:
      return 'crosshair';
    case config.resizeHandleName:
      const angle = (matrix.matrixToAngle(shape.transformMatrix) + 360) % 360;
      const screenProjectedAngle = angle + shape.cursorAngle;
      const discretizedAngle = (Math.round(screenProjectedAngle / 45) * 45 + 360) % 360;
      return bidirectionalCursors[discretizedAngle];
    default:
      return draggedPrimaryShape ? 'grabbing' : 'grab';
  }
})(focusedShape, draggedPrimaryShape);

// this is the core scenegraph update invocation: upon new cursor position etc. emit the new scenegraph
// it's _the_ state representation (at a PoC level...) comprising of transient properties eg. draggedShape, and the
// collection of shapes themselves
const nextScene = select(
  (
    hoveredShape,
    selectedShapeIds,
    selectedPrimaryShapes,
    shapes,
    gestureEnd,
    draggedShape,
    cursor,
    selectionState,
    mouseTransformState,
    selectedShapes
  ) => {
    const selectedLeafShapes = getLeafs(
      shape => shape.subtype === config.adHocGroupName,
      shapes,
      selectionState.shapes
        .map(s => (s.type === 'annotation' ? shapes.find(ss => ss.id === s.parent) : s))
        .filter(identity)
    )
      .filter(shape => shape.type !== 'annotation')
      .map(s => s.id);
    return {
      hoveredShape,
      selectedShapes: selectedShapeIds,
      selectedLeafShapes,
      selectedPrimaryShapes,
      shapes,
      gestureEnd,
      draggedShape,
      cursor,
      selectionState,
      mouseTransformState,
      selectedShapeObjects: selectedShapes,
    };
  }
)(
  hoveredShape,
  groupedSelectedShapeIds,
  groupedSelectedPrimaryShapeIds,
  globalTransformShapes,
  gestureEnd,
  draggedShape,
  cursor,
  selectionState,
  mouseTransformState,
  groupedSelectedShapes
);

module.exports = {
  cursorPosition,
  mouseIsDown,
  dragVector,
  nextScene,
  focusedShape,
  primaryUpdate,
  shapes,
  focusedShapes,
  selectedShapes: selectedShapeIds,
};
