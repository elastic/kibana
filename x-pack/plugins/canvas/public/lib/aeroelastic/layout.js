/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const { select } = require('./state');
const { getId } = require('./../../lib/get_id');

const {
  actionEvent,
  dragging,
  dragVector,
  cursorPosition,
  gestureEnd,
  metaHeld,
  mouseButton,
  mouseDowned,
  mouseIsDown,
  optionHeld,
  shiftHeld,
} = require('./gestures');

const { shapesAt, landmarkPoint } = require('./geometry');

const matrix = require('./matrix');
const matrix2d = require('./matrix2d');

const {
  arrayToMap,
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
const configuration = state => {
  return state.configuration;
};

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

const hoveredShapes = select((configuration, shapes, cursorPosition) =>
  shapesAt(
    shapes.filter(
      // second AND term excludes intra-group element hover (and therefore drag & drop), todo: remove this current limitation
      s =>
        (s.type !== 'annotation' || s.interactive) &&
        (configuration.intraGroupManipulation || !s.parent || s.type === 'annotation')
    ),
    cursorPosition
  )
)(configuration, shapes, cursorPosition);

const depthIndex = 0;
const hoveredShape = select(hoveredShapes =>
  hoveredShapes.length ? hoveredShapes[depthIndex] : null
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

const transformGestures = mouseTransformGesture;

const restateShapesEvent = select(action => {
  if (!action || action.type !== 'restateShapesEvent') {
    return null;
  }
  const shapes = action.payload.newShapes;
  const local = shape => {
    if (!shape.parent) {
      return shape.transformMatrix;
    }
    return matrix.multiply(
      matrix.invert(shapes.find(s => s.id === shape.parent).transformMatrix),
      shape.transformMatrix
    );
  };
  const newShapes = shapes.map(s => ({ ...s, localTransformMatrix: local(s) }));
  return { newShapes, uid: action.payload.uid };
})(primaryUpdate);

// directSelect is an API entry point (via the `shapeSelect` action) that lets the client directly specify what thing
// is selected, as otherwise selection is driven by gestures and knowledge of element positions
const directSelect = select(action =>
  action && action.type === 'shapeSelect' ? action.payload : null
)(primaryUpdate);

const selectedShapeObjects = select(scene => scene.selectedShapeObjects || [])(scene);

const singleSelect = (prev, configuration, hoveredShapes, metaHeld, uid) => {
  // cycle from top ie. from zero after the cursor position changed ie. !sameLocation
  const down = true; // this function won't be called otherwise
  const depthIndex =
    configuration.depthSelect && metaHeld
      ? (prev.depthIndex + (down && !prev.down ? 1 : 0)) % hoveredShapes.length
      : 0;
  return {
    shapes: hoveredShapes.length ? [hoveredShapes[depthIndex]] : [],
    uid,
    depthIndex: hoveredShapes.length ? depthIndex : 0,
    down,
  };
};

const multiSelect = (prev, configuration, hoveredShapes, metaHeld, uid, selectedShapeObjects) => {
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

const contentShapes = (allShapes, shapes) => {
  const idMap = arrayToMap(allShapes.map(shape => shape.id));
  return shapes.filter(shape => idMap[shape.id]).map(contentShape(allShapes));
};

const selectionState = select(
  (
    prev,
    configuration,
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
    if (selectedShapeObjects) {
      prev.shapes = selectedShapeObjects.slice();
    }
    // take action on mouse down only, and if the uid changed (except with directSelect), ie. bail otherwise
    if (mouseButtonUp || (uidUnchanged && !directSelect)) {
      return { ...prev, down, uid, metaHeld };
    }
    const selectFunction = configuration.singleSelect || !multiselect ? singleSelect : multiSelect;
    return selectFunction(prev, configuration, hoveredShapes, metaHeld, uid, selectedShapeObjects);
  }
)(
  selectedShapesPrev,
  configuration,
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

const primaryShape = shape => (shape.type === 'annotation' ? shape.parent : shape.id); // fixme unify with contentShape

const selectedPrimaryShapeIds = select(shapes => shapes.map(primaryShape))(selectedShapes);

const rotationManipulation = configuration => ({
  shape,
  directShape,
  cursorPosition: { x, y },
  alterSnapGesture,
}) => {
  // rotate around a Z-parallel line going through the shape center (ie. around the center)
  if (!shape || !directShape) {
    return { transforms: [], shapes: [] };
  }
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
    pixelDifference < configuration.rotateSnapInPixels && !relaxed ? closest45deg : newAngle;
  const result = matrix.rotateZ(oldAngle - newSnappedAngle);
  return { transforms: [result], shapes: [shape.id] };
};

const resizeMultiplierHorizontal = { left: -1, center: 0, right: 1 };
const resizeMultiplierVertical = { top: -1, center: 0, bottom: 1 };
const xNames = { '-1': 'left', '0': 'center', '1': 'right' };
const yNames = { '-1': 'top', '0': 'center', '1': 'bottom' };

const minimumSize = (min, { a, b, baseAB }, vector) => {
  // don't allow an element size of less than the minimumElementSize
  // todo switch to matrix algebra
  return [
    Math.max(baseAB ? min - baseAB[0] : min - a, vector[0]),
    Math.max(baseAB ? min - baseAB[1] : min - b, vector[1]),
  ];
};

const centeredResizeManipulation = configuration => ({ gesture, shape, directShape }) => {
  const transform = gesture.cumulativeTransform;
  // scaling such that the center remains in place (ie. the other side of the shape can grow/shrink)
  if (!shape || !directShape) {
    return { transforms: [], shapes: [] };
  }
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
  const cappedOrientedVector = minimumSize(configuration.minimumElementSize, shape, orientedVector);
  return {
    cumulativeTransforms: [],
    cumulativeSizes: [gesture.sizes || matrix2d.translate(...cappedOrientedVector)],
    shapes: [shape.id],
  };
};

const asymmetricResizeManipulation = configuration => ({ gesture, shape, directShape }) => {
  const transform = gesture.cumulativeTransform;
  // scaling such that the center remains in place (ie. the other side of the shape can grow/shrink)
  if (!shape || !directShape) {
    return { transforms: [], shapes: [] };
  }
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
  const cappedOrientedVector = minimumSize(configuration.minimumElementSize, shape, orientedVector);

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
  configuration,
  directTransforms,
  directShapes,
  allShapes,
  cursorPosition,
  alterSnapGesture
) => {
  const shapeIds = directShapes.map(
    shape =>
      shape.type === 'annotation' &&
      shape.subtype === configuration.rotationHandleName &&
      shape.parent
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
  return tuples.map(rotationManipulation(configuration));
};

const resizeAnnotationManipulation = (
  configuration,
  transformGestures,
  directShapes,
  allShapes,
  manipulator
) => {
  const shapeIds = directShapes.map(
    shape =>
      shape.type === 'annotation' &&
      shape.subtype === configuration.resizeHandleName &&
      shape.parent
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

const resizeManipulator = select((configuration, toggle) =>
  (toggle ? centeredResizeManipulation : asymmetricResizeManipulation)(configuration)
)(configuration, symmetricManipulation);

const transformIntents = select(
  (
    configuration,
    transformGestures,
    directShapes,
    shapes,
    cursorPosition,
    alterSnapGesture,
    manipulator
  ) => [
    ...directShapeTranslateManipulation(
      transformGestures.map(g => g.cumulativeTransform),
      directShapes
    ),
    ...rotationAnnotationManipulation(
      configuration,
      transformGestures.map(g => g.transform),
      directShapes,
      shapes,
      cursorPosition,
      alterSnapGesture
    ),
    ...resizeAnnotationManipulation(
      configuration,
      transformGestures,
      directShapes,
      shapes,
      manipulator
    ),
  ]
)(
  configuration,
  transformGestures,
  selectedShapes,
  shapes,
  cursorPosition,
  alterSnapGesture,
  resizeManipulator
);

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

const cascadeUnsnappedTransforms = (shapes, shape) => {
  if (!shape.parent) {
    return shape.localTransformMatrix;
  } // boost for common case of toplevel shape
  const upstreams = getUpstreams(shapes, shape);
  const upstreamTransforms = upstreams.map(shape => {
    return shape.localTransformMatrix;
  });
  const cascadedTransforms = matrix.reduceTransforms(upstreamTransforms);
  return cascadedTransforms;
};

const cascadeTransforms = (shapes, shape) => {
  const cascade = s =>
    s.snapDeltaMatrix
      ? matrix.multiply(s.localTransformMatrix, s.snapDeltaMatrix)
      : s.localTransformMatrix;
  if (!shape.parent) {
    return cascade(shape);
  } // boost for common case of toplevel shape
  const upstreams = getUpstreams(shapes, shape);
  const upstreamTransforms = upstreams.map(cascade);
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
  if (restated && restated.newShapes) {
    return restated.newShapes;
  }

  // this is the per-shape model update at the current PoC level
  return preexistingShapes;
})(shapes, restateShapesEvent);

const transformedShapes = select(applyLocalTransforms)(nextShapes, transformIntents);

const alignmentGuides = (configuration, shapes, guidedShapes, draggedShape) => {
  const result = {};
  let counter = 0;
  const extremeHorizontal = resizeMultiplierHorizontal[draggedShape.horizontalPosition];
  const extremeVertical = resizeMultiplierVertical[draggedShape.verticalPosition];
  // todo replace for loops with [].map calls; DRY it up, break out parts; several of which to move to geometry.js
  // todo switch to informative variable names
  for (let i = 0; i < guidedShapes.length; i++) {
    const d = guidedShapes[i];
    if (d.type === 'annotation') {
      continue;
    } // fixme avoid this by not letting annotations get in here
    // key points of the dragged shape bounding box
    for (let j = 0; j < shapes.length; j++) {
      const referenceShape = shapes[j];
      if (referenceShape.type === 'annotation') {
        continue;
      } // fixme avoid this by not letting annotations get in here
      if (!configuration.intraGroupManipulation && referenceShape.parent) {
        continue;
      } // for now, don't snap to grouped elements fixme could snap, but make sure transform is gloabl
      if (
        configuration.intraGroupSnapOnly &&
        d.parent !== referenceShape.parent &&
        d.parent !== referenceShape.id /* allow parent */
      ) {
        continue;
      }
      const s =
        d.id === referenceShape.id
          ? {
              ...d,
              localTransformMatrix: d.baselineLocalTransformMatrix || d.localTransformMatrix,
              a: d.baseAB ? d.baseAB[0] : d.a,
              b: d.baseAB ? d.baseAB[1] : d.b,
            }
          : referenceShape;
      // key points of the stationery shape
      for (let k = -1; k < 2; k++) {
        for (let l = -1; l < 2; l++) {
          if ((k && !l) || (!k && l)) {
            continue;
          } // don't worry about midpoints of the edges, only the center
          if (
            draggedShape.subtype === configuration.resizeHandleName &&
            !(
              (extremeHorizontal === k && extremeVertical === l) || // moved corner
              // moved midpoint on horizontal border
              (extremeHorizontal === 0 && k !== 0 && extremeVertical === l) ||
              // moved midpoint on vertical border
              (extremeVertical === 0 && l !== 0 && extremeHorizontal === k)
            )
          ) {
            continue;
          }
          const D = landmarkPoint(d.a, d.b, cascadeUnsnappedTransforms(shapes, d), k, l);
          for (let m = -1; m < 2; m++) {
            for (let n = -1; n < 2; n++) {
              if ((m && !n) || (!m && n)) {
                continue;
              } // don't worry about midpoints of the edges, only the center
              const S = landmarkPoint(s.a, s.b, cascadeUnsnappedTransforms(shapes, s), m, n);
              for (let dim = 0; dim < 2; dim++) {
                const orthogonalDimension = 1 - dim;
                const dd = D[dim];
                const ss = S[dim];
                const key = k + '|' + l + '|' + dim;
                const signedDistance = dd - ss;
                const distance = Math.abs(signedDistance);
                const currentClosest = result[key];
                if (
                  Math.round(distance) <= configuration.guideDistance &&
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
                      configuration.atopZ
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

const alignmentGuideAnnotations = select(
  (configuration, shapes, draggedPrimaryShape, draggedShape) => {
    const guidedShapes = draggedPrimaryShape
      ? [shapes.find(s => s.id === draggedPrimaryShape.id)].filter(identity)
      : [];
    return guidedShapes.length
      ? alignmentGuides(configuration, shapes, guidedShapes, draggedShape).map(shape => ({
          ...shape,
          id: configuration.alignmentGuideName + '_' + shape.id,
          type: 'annotation',
          subtype: configuration.alignmentGuideName,
          interactive: false,
          backgroundColor: 'magenta',
          parent: null,
        }))
      : [];
  }
)(configuration, transformedShapes, draggedPrimaryShape, draggedShape);

const hoverAnnotations = select(
  (configuration, hoveredShape, selectedPrimaryShapeIds, draggedShape) => {
    return hoveredShape &&
      hoveredShape.type !== 'annotation' &&
      selectedPrimaryShapeIds.indexOf(hoveredShape.id) === -1 &&
      !draggedShape
      ? [
          {
            ...hoveredShape,
            id: configuration.hoverAnnotationName + '_' + hoveredShape.id,
            type: 'annotation',
            subtype: configuration.hoverAnnotationName,
            interactive: false,
            localTransformMatrix: matrix.multiply(
              hoveredShape.localTransformMatrix,
              matrix.translate(0, 0, configuration.hoverLift)
            ),
            parent: null, // consider linking to proper parent, eg. for more regular typing (ie. all shapes have all props)
          },
        ]
      : [];
  }
)(configuration, hoveredShape, selectedPrimaryShapeIds, draggedShape);

const rotationAnnotation = (configuration, shapes, selectedShapes, shape, i) => {
  const foundShape = shapes.find(s => shape.id === s.id);
  if (!foundShape) {
    return false;
  }

  if (foundShape.type === 'annotation') {
    return rotationAnnotation(
      configuration,
      shapes,
      selectedShapes,
      shapes.find(s => foundShape.parent === s.id),
      i
    );
  }
  const b = snappedB(foundShape);
  const centerTop = matrix.translate(0, -b, 0);
  const pixelOffset = matrix.translate(
    0,
    -configuration.rotateAnnotationOffset,
    configuration.atopZ
  );
  const transform = matrix.multiply(centerTop, pixelOffset);
  return {
    id: configuration.rotationHandleName + '_' + i,
    type: 'annotation',
    subtype: configuration.rotationHandleName,
    interactive: true,
    parent: foundShape.id,
    localTransformMatrix: transform,
    backgroundColor: 'rgb(0,0,255,0.3)',
    a: configuration.rotationHandleSize,
    b: configuration.rotationHandleSize,
  };
};

const resizePointAnnotations = (configuration, parent, a, b) => ([x, y, cursorAngle]) => {
  const markerPlace = matrix.translate(x * a, y * b, configuration.resizeAnnotationOffsetZ);
  const pixelOffset = matrix.translate(
    -x * configuration.resizeAnnotationOffset,
    -y * configuration.resizeAnnotationOffset,
    configuration.atopZ + 10
  );
  const transform = matrix.multiply(markerPlace, pixelOffset);
  const xName = xNames[x];
  const yName = yNames[y];
  return {
    id: [configuration.resizeHandleName, xName, yName, parent].join('_'),
    type: 'annotation',
    subtype: configuration.resizeHandleName,
    horizontalPosition: xName,
    verticalPosition: yName,
    cursorAngle,
    interactive: true,
    parent: parent.id,
    localTransformMatrix: transform,
    backgroundColor: 'rgb(0,255,0,1)',
    a: configuration.resizeAnnotationSize,
    b: configuration.resizeAnnotationSize,
  };
};

const resizeEdgeAnnotations = (configuration, parent, a, b) => ([[x0, y0], [x1, y1]]) => {
  const x = a * mean(x0, x1);
  const y = b * mean(y0, y1);
  const markerPlace = matrix.translate(x, y, configuration.atopZ - 10);
  const transform = markerPlace; // no offset etc. at the moment
  const horizontal = y0 === y1;
  const length = horizontal ? a * Math.abs(x1 - x0) : b * Math.abs(y1 - y0);
  const sectionHalfLength = Math.max(0, length / 2 - configuration.resizeAnnotationConnectorOffset);
  const width = 0.5;
  return {
    id: [
      configuration.resizeConnectorName,
      xNames[x0],
      yNames[y0],
      xNames[x1],
      yNames[y1],
      parent,
    ].join('_'),
    type: 'annotation',
    subtype: configuration.resizeConnectorName,
    interactive: true,
    parent: parent.id,
    localTransformMatrix: transform,
    backgroundColor: configuration.devColor,
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

const groupedShape = properShape => shape => shape.parent === properShape.id;

const magic = (configuration, shape, shapes) => {
  const epsilon = configuration.rotationEpsilon;
  const integralOf = Math.PI * 2;
  const isIntegerMultiple = shape => {
    const zRotation = matrix.matrixToAngle(shape.localTransformMatrix);
    const ratio = zRotation / integralOf;
    return Math.abs(Math.round(ratio) - ratio) < epsilon;
  };

  function recurse(shape) {
    return shapes.filter(groupedShape(shape)).every(resizableChild);
  }

  function resizableChild(shape) {
    return isIntegerMultiple(shape) && recurse(shape);
  }

  return recurse(shape);
};

function resizeAnnotation(configuration, shapes, selectedShapes, shape) {
  const foundShape = shapes.find(s => shape.id === s.id);
  const properShape =
    foundShape &&
    (foundShape.subtype === configuration.resizeHandleName
      ? shapes.find(s => shape.parent === s.id)
      : foundShape);
  if (!foundShape) {
    return [];
  }

  if (foundShape.subtype === configuration.resizeHandleName) {
    // preserve any interactive annotation when handling
    const result = foundShape.interactive
      ? resizeAnnotationsFunction(configuration, {
          shapes,
          selectedShapes: [shapes.find(s => shape.parent === s.id)],
        })
      : [];
    return result;
  }
  if (foundShape.type === 'annotation') {
    return resizeAnnotation(
      configuration,
      shapes,
      selectedShapes,
      shapes.find(s => foundShape.parent === s.id)
    );
  }

  // fixme left active: snap wobble. right active: opposite side wobble.
  const a = snappedA(properShape);
  const b = snappedB(properShape);
  const allowResize =
    properShape.type !== 'group' ||
    (configuration.groupResize &&
      magic(configuration, properShape, shapes.filter(s => s.type !== 'annotation')));
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
  const resizePoints = resizeVertices.map(resizePointAnnotations(configuration, shape, a, b));
  const connectors = connectorVertices.map(resizeEdgeAnnotations(configuration, shape, a, b));
  return [...resizePoints, ...connectors];
}

function resizeAnnotationsFunction(configuration, { shapes, selectedShapes }) {
  const shapesToAnnotate = selectedShapes;
  return flatten(
    shapesToAnnotate
      .map(shape => {
        return resizeAnnotation(configuration, shapes, selectedShapes, shape);
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
    if (!snapOffsetX && !snapOffsetY) {
      return shape;
    }
    const snapOffset = matrix.translateComponent(
      matrix.multiply(
        matrix.rotateZ(matrix.matrixToAngle(draggedElement.localTransformMatrix)),
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
    const angle = matrix.matrixToAngle(draggedElement.localTransformMatrix);
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
    configuration,
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
    if (
      subtype &&
      [
        configuration.resizeHandleName,
        configuration.adHocGroupName,
        configuration.persistentGroupName,
      ].indexOf(subtype) === -1
    ) {
      return contentShapes;
    }
    const constraints = alignmentGuideAnnotations; // fixme split concept of snap constraints and their annotations
    const relaxed = alterSnapGesture.indexOf('relax') !== -1;
    const constrained = configuration.snapConstraint && !relaxed;
    const horizontalConstraint = constrained && directionalConstraint(constraints, isHorizontal);
    const verticalConstraint = constrained && directionalConstraint(constraints, isVertical);
    const snapper =
      subtype === configuration.resizeHandleName
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
  configuration,
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

const dissolveGroups = (groupsToDissolve, shapes, selectedShapes) => {
  return {
    shapes: shapes
      .filter(s => !groupsToDissolve.find(g => s.id === g.id))
      .map(shape => {
        const preexistingGroupParent = groupsToDissolve.find(
          groupShape => groupShape.id === shape.parent
        );
        // if linked, dissociate from ad hoc group parent
        return preexistingGroupParent
          ? {
              ...shape,
              parent: null,
              localTransformMatrix: matrix.multiply(
                // pulling preexistingGroupParent from `shapes` to get fresh matrices
                shapes.find(s => s.id === preexistingGroupParent.id).localTransformMatrix, // reinstate the group offset onto the child
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

const asYetUngroupedShapes = (preexistingAdHocGroups, selectedShapes) =>
  selectedShapes.filter(hasNoParentWithin(preexistingAdHocGroups));

const idMatch = shape => s => s.id === shape.id;
const idsMatch = selectedShapes => shape => selectedShapes.find(idMatch(shape));

const axisAlignedBoundingBoxShape = (configuration, shapesToBox) => {
  const axisAlignedBoundingBox = getAABB(shapesToBox);
  const { a, b, localTransformMatrix, rigTransform } = projectAABB(axisAlignedBoundingBox);
  const id = getId(configuration.groupName);
  const aabbShape = {
    id,
    type: configuration.groupName,
    subtype: configuration.adHocGroupName,
    a,
    b,
    localTransformMatrix,
    rigTransform,
    parent: null,
  };
  return aabbShape;
};

const resetChild = s => {
  if (s.childBaseAB) {
    s.childBaseAB = null;
    s.baseLocalTransformMatrix = null;
  }
};

const childScaler = ({ a, b }, baseAB) => {
  // a scaler of 0, encountered when element is shrunk to zero size, would result in a non-invertible transform matrix
  const epsilon = 1e-6;
  const groupScaleX = Math.max(a / baseAB[0], epsilon);
  const groupScaleY = Math.max(b / baseAB[1], epsilon);
  const groupScale = matrix.scale(groupScaleX, groupScaleY, 1);
  return groupScale;
};

const resizeChild = groupScale => s => {
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
  const inverseBackScaler = matrix.invert(backScaler);
  const abTuple = matrix.mvMultiply(matrix.multiply(backScaler, impliedScale), [1, 1, 1, 1]);
  s.localTransformMatrix = matrix.multiply(
    T,
    matrix.multiply(inverseImpliedScale, inverseBackScaler)
  );
  s.a = abTuple[0];
  s.b = abTuple[1];
  s.childBaseAB = childBaseAB;
  s.baseLocalTransformMatrix = baseLocalTransformMatrix;
};

const resizeGroup = (shapes, rootElement) => {
  const idMap = {};
  for (let i = 0; i < shapes.length; i++) {
    idMap[shapes[i].id] = shapes[i];
  }

  const depths = {};
  const ancestorsLength = shape => (shape.parent ? ancestorsLength(idMap[shape.parent]) + 1 : 0);
  for (let i = 0; i < shapes.length; i++) {
    depths[shapes[i].id] = ancestorsLength(shapes[i]);
  }

  const resizedParents = { [rootElement.id]: rootElement };
  const sortedShapes = shapes.slice().sort((a, b) => depths[a.id] - depths[b.id]);
  const parentResized = s => Boolean(s.childBaseAB || s.baseAB);
  for (let i = 0; i < sortedShapes.length; i++) {
    const shape = sortedShapes[i];
    const parent = resizedParents[shape.parent];
    if (parent) {
      resizedParents[shape.id] = shape;
      if (parentResized(parent)) {
        resizeChild(childScaler(parent, parent.childBaseAB || parent.baseAB))(shape);
      } else {
        resetChild(shape);
      }
    }
  }
  return sortedShapes;
};

const getLeafs = (descendCondition, allShapes, shapes) =>
  removeDuplicates(
    s => s.id,
    flatten(
      shapes.map(shape =>
        descendCondition(shape) ? allShapes.filter(s => s.parent === shape.id) : shape
      )
    )
  );

const preserveCurrentGroups = (shapes, selectedShapes) => ({ shapes, selectedShapes });

const groupAction = select(action => {
  const event = action && action.event;
  return event === 'group' || event === 'ungroup' ? event : null;
})(actionEvent);

const grouping = select((configuration, shapes, selectedShapes, groupAction) => {
  const childOfGroup = shape => shape.parent && shape.parent.startsWith(configuration.groupName);
  const isAdHocGroup = shape =>
    shape.type === configuration.groupName && shape.subtype === configuration.adHocGroupName;
  const preexistingAdHocGroups = shapes.filter(isAdHocGroup);
  const matcher = idsMatch(selectedShapes);
  const selectedFn = shape => matcher(shape) && shape.type !== 'annotation';
  const freshSelectedShapes = shapes.filter(selectedFn);
  const freshNonSelectedShapes = shapes.filter(not(selectedFn));
  const isGroup = shape => shape.type === configuration.groupName;
  const isOrBelongsToGroup = shape => isGroup(shape) || childOfGroup(shape);
  const someSelectedShapesAreGrouped = selectedShapes.some(isOrBelongsToGroup);
  const selectionOutsideGroup = !someSelectedShapesAreGrouped;

  if (groupAction === 'group') {
    const selectedAdHocGroupsToPersist = selectedShapes.filter(
      s => s.subtype === configuration.adHocGroupName
    );
    return {
      shapes: shapes.map(s =>
        s.subtype === configuration.adHocGroupName
          ? { ...s, subtype: configuration.persistentGroupName }
          : s
      ),
      selectedShapes: selectedShapes
        .filter(selected => selected.subtype !== configuration.adHocGroupName)
        .concat(
          selectedAdHocGroupsToPersist.map(shape => ({
            ...shape,
            subtype: configuration.persistentGroupName,
          }))
        ),
    };
  }

  if (groupAction === 'ungroup') {
    return dissolveGroups(
      selectedShapes.filter(s => s.subtype === configuration.persistentGroupName),
      shapes,
      asYetUngroupedShapes(preexistingAdHocGroups, freshSelectedShapes)
    );
  }

  // ad hoc groups must dissolve if 1. the user clicks away, 2. has a selection that's not the group, or 3. selected something else
  if (preexistingAdHocGroups.length && selectionOutsideGroup) {
    // asYetUngroupedShapes will trivially be the empty set if case 1 is realized: user clicks aside -> selectedShapes === []
    // return preserveCurrentGroups(shapes, selectedShapes);
    return dissolveGroups(
      preexistingAdHocGroups,
      shapes,
      asYetUngroupedShapes(preexistingAdHocGroups, freshSelectedShapes)
    );
  }

  // preserve the current selection if the sole ad hoc group is being manipulated
  const elements = contentShapes(shapes, selectedShapes);
  if (elements.length === 1 && elements[0].type === 'group') {
    return configuration.groupResize
      ? {
          shapes: [
            ...resizeGroup(shapes.filter(s => s.type !== 'annotation'), elements[0]),
            ...shapes.filter(s => s.type === 'annotation'),
          ],
          selectedShapes,
        }
      : preserveCurrentGroups(shapes, selectedShapes);
  }
  // group items or extend group bounding box (if enabled)
  if (selectedShapes.length < 2) {
    // resize the group if needed (ad-hoc group resize is manipulated)
    return preserveCurrentGroups(shapes, selectedShapes);
  } else {
    // group together the multiple items
    const group = axisAlignedBoundingBoxShape(configuration, freshSelectedShapes);
    const selectedLeafShapes = getLeafs(
      shape => shape.subtype === configuration.adHocGroupName,
      shapes,
      freshSelectedShapes
    );
    const parentedSelectedShapes = selectedLeafShapes.map(shape => ({
      ...shape,
      parent: group.id,
      localTransformMatrix: matrix.multiply(group.rigTransform, shape.transformMatrix),
    }));
    const nonGroupGraphConstituent = s =>
      s.subtype !== configuration.adHocGroupName &&
      !parentedSelectedShapes.find(ss => s.id === ss.id);
    const dissociateFromParentIfAny = s =>
      s.parent &&
      s.parent.startsWith(configuration.groupName) &&
      preexistingAdHocGroups.find(ahg => ahg.id === s.parent)
        ? { ...s, parent: null }
        : s;
    const allTerminalShapes = parentedSelectedShapes.concat(
      freshNonSelectedShapes.filter(nonGroupGraphConstituent).map(dissociateFromParentIfAny)
    );
    return {
      shapes: allTerminalShapes.concat([group]),
      selectedShapes: [group],
    };
  }
})(configuration, constrainedShapesWithPreexistingAnnotations, selectedShapes, groupAction);

const groupedSelectedShapes = select(({ selectedShapes }) => selectedShapes)(grouping);

const groupedSelectedShapeIds = select(selectedShapes => selectedShapes.map(shape => shape.id))(
  groupedSelectedShapes
);

const groupedSelectedPrimaryShapeIds = select(selectedShapes => selectedShapes.map(primaryShape))(
  groupedSelectedShapes
);

const resizeAnnotations = select(resizeAnnotationsFunction)(configuration, grouping);

const rotationAnnotations = select((configuration, { shapes, selectedShapes }) => {
  const shapesToAnnotate = selectedShapes;
  return shapesToAnnotate
    .map((shape, i) => rotationAnnotation(configuration, shapes, selectedShapes, shape, i))
    .filter(identity);
})(configuration, grouping);

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

const cursor = select((configuration, shape, draggedPrimaryShape) => {
  if (!shape) {
    return 'auto';
  }
  switch (shape.subtype) {
    case configuration.rotationHandleName:
      return 'crosshair';
    case configuration.resizeHandleName:
      const angle = ((matrix.matrixToAngle(shape.transformMatrix) * 180) / Math.PI + 360) % 360;
      const screenProjectedAngle = angle + shape.cursorAngle;
      const discretizedAngle = (Math.round(screenProjectedAngle / 45) * 45 + 360) % 360;
      return bidirectionalCursors[discretizedAngle];
    default:
      return draggedPrimaryShape ? 'grabbing' : 'grab';
  }
})(configuration, focusedShape, draggedPrimaryShape);

// this is the core scenegraph update invocation: upon new cursor position etc. emit the new scenegraph
// it's _the_ state representation (at a PoC level...) comprising of transient properties eg. draggedShape, and the
// collection of shapes themselves
const nextScene = select(
  (
    configuration,
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
      shape => shape.type === configuration.groupName,
      shapes,
      selectionState.shapes
        .map(s => (s.type === 'annotation' ? shapes.find(ss => ss.id === s.parent) : s))
        .filter(identity)
    )
      .filter(shape => shape.type !== 'annotation')
      .map(s => s.id);
    return {
      configuration,
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
  configuration,
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
