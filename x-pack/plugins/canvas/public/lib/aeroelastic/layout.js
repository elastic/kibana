/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const { select, selectReduce } = require('./state');

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
} = require('./gestures');

const { shapesAt, landmarkPoint } = require('./geometry');

const matrix = require('./matrix');
const matrix2d = require('./matrix2d');

const config = require('./config');

const { identity, disjunctiveUnion, mean, shallowEqual, unnest } = require('./functional');

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
  shapesAt(shapes.filter(s => s.type !== 'annotation' || s.interactive), cursorPosition)
)(shapes, cursorPosition);

const hoveredShape = selectReduce(
  (prev, hoveredShapes) => {
    if (hoveredShapes.length) {
      const depthIndex = 0; // (prev.depthIndex + 1) % hoveredShapes.length;
      return {
        shape: hoveredShapes[depthIndex],
        depthIndex,
      };
    } else {
      return {
        shape: null,
        depthIndex: 0,
      };
    }
  },
  {
    shape: null,
    depthIndex: 0,
  },
  tuple => tuple.shape
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

const initialTransformTuple = {
  deltaX: 0,
  deltaY: 0,
  transform: null,
  cumulativeTransform: null,
};

const mouseTransformGesture = selectReduce(
  (prev, dragging, { x0, y0, x1, y1 }) => {
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
  },
  initialTransformTuple,
  tuple =>
    [tuple]
      .filter(tuple => tuple.transform)
      .map(({ transform, cumulativeTransform }) => ({ transform, cumulativeTransform }))
)(dragging, dragVector);

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

const initialSelectedShapeState = {
  shapes: [],
  uid: null,
  depthIndex: 0,
  down: false,
  metaHeld: false,
};

const singleSelect = (prev, hoveredShapes, metaHeld, down, uid) => {
  // cycle from top ie. from zero after the cursor position changed ie. !sameLocation
  const metaChanged = metaHeld !== prev.metaHeld;
  const depthIndex =
    config.depthSelect && metaHeld
      ? (prev.depthIndex + (down && !prev.down ? 1 : 0)) % hoveredShapes.length
      : 0;
  return hoveredShapes.length
    ? {
        shapes: [hoveredShapes[depthIndex]],
        uid,
        depthIndex,
        down,
        metaHeld,
        metaChanged: depthIndex === prev.depthIndex ? metaChanged : false,
      }
    : { ...initialSelectedShapeState, uid, down, metaHeld, metaChanged };
};

const multiSelect = (prev, hoveredShapes, metaHeld, down, uid) => {
  return {
    shapes: hoveredShapes.length
      ? disjunctiveUnion(shape => shape.id, prev.shapes, hoveredShapes)
      : [],
    uid,
  };
};

const selectedShapes = selectReduce(
  (prev, hoveredShapes, { down, uid }, metaHeld, directSelect, allShapes) => {
    const mouseButtonUp = !down;
    if (
      directSelect &&
      directSelect.shapes &&
      !shallowEqual(directSelect.shapes, prev.shapes.map(shape => shape.id))
    ) {
      const { shapes, uid } = directSelect;
      return { ...prev, shapes: shapes.map(id => allShapes.find(shape => shape.id === id)), uid };
    }
    if (uid === prev.uid && !directSelect) return prev;
    if (mouseButtonUp) return { ...prev, down, uid, metaHeld }; // take action on mouse down only, ie. bail otherwise
    const selectFunction = config.singleSelect ? singleSelect : multiSelect;
    const result = selectFunction(prev, hoveredShapes, metaHeld, down, uid);
    return result;
  },
  initialSelectedShapeState,
  d => d.shapes
)(hoveredShapes, mouseButton, metaHeld, directSelect, shapes);

const selectedShapeIds = select(shapes => shapes.map(shape => shape.id))(selectedShapes);

const primaryShape = shape => shape.parent || shape.id;

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
  const tuples = unnest(
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
  const tuples = unnest(
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
  const transformIntents = unnest(
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
  const sizeIntents = unnest(
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
  const cumulativeTransformIntents = unnest(
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
  const cumulativeSizeIntents = unnest(
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

const shapeCascadeTransforms = shapes => shape => {
  const upstreams = getUpstreams(shapes, shape);
  const upstreamTransforms = upstreams.map(shape => {
    return shape.snapDeltaMatrix
      ? matrix.multiply(shape.localTransformMatrix, shape.snapDeltaMatrix)
      : shape.localTransformMatrix;
  });
  const cascadedTransforms = matrix.reduceTransforms(upstreamTransforms);

  return {
    ...shape,
    transformMatrix: cascadedTransforms,
    width: 2 * snappedA(shape),
    height: 2 * snappedB(shape),
  };
};

const cascadeTransforms = shapes => shapes.map(shapeCascadeTransforms(shapes));

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
      if (d.id === s.id) continue;
      if (s.type === 'annotation') continue; // fixme avoid this by not letting annotations get in here
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

/* upcoming functionality
const draggedShapes = select(
  (shapes, selectedShapeIds, mouseIsDown) =>
    mouseIsDown ? shapes.filter(shape => selectedShapeIds.indexOf(shape.id) !== -1) : []
)(nextShapes, selectedShapeIds, mouseIsDown);
*/

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
      ? resizeAnnotationsFunction(shapes, [shapes.find(s => shape.parent === s.id)])
      : [];
    return result;
  }
  if (foundShape.type === 'annotation')
    return resizeAnnotation(shapes, selectedShapes, shapes.find(s => foundShape.parent === s.id));

  // fixme left active: snap wobble. right active: opposite side wobble.
  const a = snappedA(properShape); // properShape.width / 2;;
  const b = snappedB(properShape); // properShape.height / 2;
  const resizePoints = [
    [-1, -1, 315],
    [1, -1, 45],
    [1, 1, 135],
    [-1, 1, 225], // corners
    [0, -1, 0],
    [1, 0, 90],
    [0, 1, 180],
    [-1, 0, 270], // edge midpoints
  ].map(resizePointAnnotations(shape.id, a, b));
  const connectors = [
    [[-1, -1], [0, -1]],
    [[0, -1], [1, -1]],
    [[1, -1], [1, 0]],
    [[1, 0], [1, 1]],
    [[1, 1], [0, 1]],
    [[0, 1], [-1, 1]],
    [[-1, 1], [-1, 0]],
    [[-1, 0], [-1, -1]],
  ].map(resizeEdgeAnnotations(shape.id, a, b));
  return [...resizePoints, ...connectors];
}

function resizeAnnotationsFunction(shapes, selectedShapes) {
  const shapesToAnnotate = selectedShapes;
  return unnest(
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
  return {
    ...shape,
    snapDeltaMatrix: null,
    snapResizeVector: null,
    localTransformMatrix: shape.snapDeltaMatrix
      ? matrix.multiply(shape.localTransformMatrix, shape.snapDeltaMatrix)
      : shape.localTransformMatrix,
    a: snappedA(shape),
    b: snappedB(shape),
  };
};

const translateShapeSnap = (horizontalConstraint, verticalConstraint, draggedElement) => shape => {
  const constrainedShape = draggedElement && shape.id === draggedElement.id;
  const constrainedX = horizontalConstraint && horizontalConstraint.constrained === shape.id;
  const constrainedY = verticalConstraint && verticalConstraint.constrained === shape.id;
  const snapOffsetX = constrainedX ? -horizontalConstraint.signedDistance : 0;
  const snapOffsetY = constrainedY ? -verticalConstraint.signedDistance : 0;
  if (constrainedX || constrainedY) {
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
  } else if (constrainedShape) {
    return {
      ...shape,
      snapDeltaMatrix: null,
    };
  } else {
    return crystallizeConstraint(shape);
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
    const constraints = alignmentGuideAnnotations; // fixme split concept of snap constraints and their annotations
    const relaxed = alterSnapGesture.indexOf('relax') !== -1;
    const constrained = config.snapConstraint && !relaxed;
    const horizontalConstraint = constrained && directionalConstraint(constraints, isHorizontal);
    const verticalConstraint = constrained && directionalConstraint(constraints, isVertical);
    const snapper = draggedShape
      ? {
          [config.resizeHandleName]: resizeShapeSnap(
            horizontalConstraint,
            verticalConstraint,
            draggedElement,
            symmetricManipulation,
            draggedShape.horizontalPosition,
            draggedShape.verticalPosition
          ),
          [undefined]: translateShapeSnap(horizontalConstraint, verticalConstraint, draggedElement),
        }[draggedShape.subtype] || (shape => shape)
      : crystallizeConstraint;
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

const resizeAnnotations = select(resizeAnnotationsFunction)(
  constrainedShapesWithPreexistingAnnotations,
  selectedShapes
);

const rotationAnnotations = select((shapes, selectedShapes) => {
  const shapesToAnnotate = selectedShapes;
  return shapesToAnnotate
    .map((shape, i) => rotationAnnotation(shapes, selectedShapes, shape, i))
    .filter(identity);
})(constrainedShapesWithPreexistingAnnotations, selectedShapes);

const annotatedShapes = select(
  (shapes, alignmentGuideAnnotations, hoverAnnotations, rotationAnnotations, resizeAnnotations) => {
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
)(
  snappedShapes,
  alignmentGuideAnnotations,
  hoverAnnotations,
  rotationAnnotations,
  resizeAnnotations
);

const globalTransformShapes = select(cascadeTransforms)(annotatedShapes);

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
    selectedShapes,
    selectedPrimaryShapes,
    shapes,
    gestureEnd,
    draggedShape,
    cursor
  ) => {
    return {
      hoveredShape,
      selectedShapes,
      selectedPrimaryShapes,
      shapes,
      gestureEnd,
      draggedShape,
      cursor,
    };
  }
)(
  hoveredShape,
  selectedShapeIds,
  selectedPrimaryShapeIds,
  globalTransformShapes,
  gestureEnd,
  draggedShape,
  cursor
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

/**
 * General inputs to behaviors:
 *
 * 1. Mode: the mode the user is in. For example, clicking on a shape in 'edit' mode does something different (eg. highlight
 *    activation hotspots or show the object in a configuration tab) than in 'presentation' mode (eg. jump to a link, or just
 *    nothing). This is just an example and it can be a lot more granular, eg. a 2D vs 3D mode; perspective vs isometric;
 *    shape being translated vs resized vs whatever. Multiple modes can apply simultaneously. Modes themselves may have
 *    structure: simple, binary or multistate modes at a flat level; ring-like; tree etc. or some mix. Modes are generally
 *    not a good thing, so we should use it sparingly (see Bret Victor's reference to NOMODES as one of his examples in
 *    Inventing on Principle)
 *
 * 2. Focus: there's some notion of what the behaviors act on, for example, a shape we hover over or select; multiple
 *    shapes we select or lasso; or members of a group (direct descendants, or all descendants, or only all leafs). The
 *    focus can be implied, eg. act on whatever's currently in view. It can also arise hierarchical: eg. move shapes within
 *    a specific 'project' (normal way of working things, like editing one specific text file), or highlighting multiple
 *    shapes with a lasso within a previously focused group. There can be effects (color highlighting, autozooming etc.) that
 *    show what is currently in focus, as the user's mental model and the computer's notion of focus must go hand in hand.
 *
 * 3. Gesture: a primitive action that's raw input. Eg. moving the mouse a bit, clicking, holding down a modifier key or
 *    hitting a key. This is how the user acts on the scene. Can be for direct manipulation (eg. drag or resize) or it can
 *    be very modal (eg. a key acting in a specific mode, or a key or other gesture that triggers a new mode or cancels a
 *    preexisting mode). Gestures may be compose simultaneously (eg. clicking while holding down a modifier key) and/or
 *    temporally (eg. grab, drag, release). Ie. composition and finite state machine. But these could (should?) be modeled
 *    via submerging into specific modes. For example, grabbing an object and starting to move the mouse may induce the
 *    'drag' mode (within whatever mode we're already in). Combining modes, foci and gestures give us the typical design
 *    software toolbars, menus, palettes. For example, clicking (gesture) on the pencil icon (focus, as we're above it) will
 *    put us in the freehand drawing mode.
 *
 * 4. External variables: can be time, or a sequence of things triggered by time (eg. animation, alerting, data fetch...)
 *    or random data (for simulation) or a new piece of data from the server (in the case of collaborative editing)
 *
 * 5. Memory: undo/redo, repeat action, keyboard macros and time travel require that successive states or actions be recorded
 *    so they're recoverable later. Sometimes the challenge is in determining what the right level is. For example, should
 *    `undo` undo the last letter typed, or a larger transaction (eg. filling a field), or something in between, eg. regroup
 *    the actions and delete the lastly entered word sentence. Also, in macro recording, is actual mouse movement used, or
 *    something arising from it, eg. the selection on an object?
 *
 * Action: actions are granular, discrete pieces of progress along some user intent. Actions are not primary, except
 *         gestures. They arise from the above primary inputs. They can be hierarchical in that a series of actions (eg.
 *         selecting multiple shapes and hitting `Group`) leads to the higher level action of "group all these elements".
 *
 * All these are input to how we deduce _user intent_, therefore _action_. There can be a whirl of these things leading to
 * higher levels, eg. click (gesture) over an icon (focus) puts us in a new mode, which then alters what specific gestures,
 * modes and foci are possible; it can be an arbitrary graph. Let's try to characterize this graph...
 *
 */

/**
 * Selections
 *
 * On first sight, selection is simple. The user clicks on an Element, and thus the Element becomes selected; any previous
 * selection is cleared. If the user clicks anywhere else on the Canvas, the selection goes away.
 *
 * There are however wrinkles so large, they dwarf the original shape of the cloth:
 *
 * 1. Selecting occluded items
 *   a. by sequentially meta+clicking at a location
 *   b. via some other means, eg. some modal or non-modal popup box listing the elements underneath one another
 * 2. Selecting multiple items
 *   a. by option-clicking
 *   b. by rectangle selection or lasso selection, with requirement for point / line / area / volume touching an element
 *   c. by rectangle selection or lasso selection, with requirement for point / line / area / volume fully including an element
 *   d. select all elements of a group
 * 3. How to combine occluded item selection with multiple item selection?
 *   a. separate the notion of vertical cycling and selection (naive, otoh known by user, implementations conflate them)
 *   b. resort to the dialog or form selection (multiple ticks)
 *   c. volume aware selection
 * 4. Group related select
 *   a. select a group by its leaf node and drag the whole group with it
 *   b. select an element of a group and only move that (within the group)
 *   c. hierarchy aware select: eg. select all leaf nodes of a group at any level
 * 5. Composite selections (generalization of selecting multiple items)
 *   a. additive selections: eg. multiple rectangular brushes
 *   b. subtractive selection: eg. selecting all but a few elements of a group
 * 6. Annotation selection. Modeling controls eg. resize and rotate hotspots as annotations is useful because the
 *    display and interaction often goes hand in hand. In other words, a passive legend is but a special case of
 *    an active affordance: it just isn't interactive (noop). Also, annotations are useful to model as shapes
 *    because:
 *      a. they're part of the scenegraph
 *      b. hierarchical relations can be exploited, eg. a leaf shape or a group may have annotation that's locally
 *         positionable (eg. resize or rotate hotspots)
 *      c. the transform/projection math, and often, other facilities (eg. drag) can be shared (DRY)
 *    The complications are:
 *      a. clicking on and dragging a rotate handle shouldn't do the full selection, ie. it shouldn't get
 *         a 'selected' border, and the rotate handle shouldn't get a rotate handle of its own, recursively :-)
 *      b. clicking on a rotation handle, which is outside the element, should preserve the selected state of
 *         the element
 *      c. tbc
 */
