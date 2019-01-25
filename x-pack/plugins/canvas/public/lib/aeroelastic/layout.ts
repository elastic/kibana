/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getId } from './../../lib/get_id';
import {
  alignmentGuides,
  applyLocalTransforms,
  asymmetricResizeManipulation,
  cascadeProperties,
  centeredResizeManipulation,
  configuration,
  directionalConstraint,
  directShapeTranslateManipulation,
  draggingShape,
  getAlterSnapGesture,
  getCursor,
  getDirectSelect,
  getFocusedShape,
  getFocusedShapes,
  getGrouping,
  getHoveredShape,
  getHoveredShapes,
  getLeafs,
  getMouseTransformGesture,
  getMouseTransformGesturePrev,
  getMouseTransformState,
  getRestateShapesEvent,
  getSelectedShapeObjects,
  getShapes,
  isHorizontal,
  isVertical,
  multiSelect,
  primaryShape,
  reselectShapes,
  resizeAnnotationManipulation,
  resizeAnnotationsFunction,
  resizeShapeSnap,
  rotationAnnotation,
  rotationAnnotationManipulation,
  scene,
  singleSelect,
  translateShapeSnap,
} from './layout_functions';
import { select } from './state';

import { identity, shallowEqual } from './functional';

import {
  actionEvent,
  cursorPosition,
  dragging,
  dragVector,
  gestureEnd,
  metaHeld,
  mouseButton,
  mouseDowned,
  mouseIsDown,
  optionHeld,
  shiftHeld,
} from './gestures';

import { multiply, translate } from './matrix';

/**
 * Selectors directly from a state object
 */

export const primaryUpdate = state => state.primaryUpdate;

/**
 * Scenegraph update based on events, gestures...
 */

export const shapes = select(getShapes)(scene);

const hoveredShapes = select(getHoveredShapes)(configuration, shapes, cursorPosition);

const hoveredShape = select(getHoveredShape)(hoveredShapes);

const draggedShape = select(draggingShape)(scene, hoveredShape, mouseIsDown, mouseDowned);

export const focusedShape = select(getFocusedShape)(draggedShape, hoveredShape);

export const focusedShapes = select(getFocusedShapes)(shapes, focusedShape);

const alterSnapGesture = select(getAlterSnapGesture)(metaHeld);

const multiselectModifier = shiftHeld; // todo abstract out keybindings

const mouseTransformGesturePrev = select(getMouseTransformGesturePrev)(scene);

const mouseTransformState = select(getMouseTransformState)(
  mouseTransformGesturePrev,
  dragging,
  dragVector
);

const mouseTransformGesture = select(getMouseTransformGesture)(mouseTransformState);

const transformGestures = mouseTransformGesture;

const restateShapesEvent = select(getRestateShapesEvent)(primaryUpdate);

// directSelect is an API entry point (via the `shapeSelect` action) that lets the client directly specify what thing
const directSelect = select(getDirectSelect)(primaryUpdate);

const selectedShapeObjects = select(getSelectedShapeObjects)(scene);

const selectedShapesPrev = select(
  scene =>
    scene.selectionState || {
      shapes: [],
      uid: null,
      depthIndex: 0,
      down: false,
    }
)(scene);

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

export const selectedShapeIds = select(shapes => shapes.map(shape => shape.id))(selectedShapes);

// fixme unify with contentShape

const selectedPrimaryShapeIds = select(shapes => shapes.map(primaryShape))(selectedShapes);

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

// "cumulative" is the effect of the ongoing interaction; "baseline" is sans "cumulative", plain "localTransformMatrix"

const nextShapes = select((preexistingShapes, restated) => {
  if (restated && restated.newShapes) {
    return restated.newShapes;
  }

  // this is the per-shape model update at the current PoC level
  return preexistingShapes;
})(shapes, restateShapesEvent);

const transformedShapes = select(applyLocalTransforms)(nextShapes, transformIntents);

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
            localTransformMatrix: multiply(
              hoveredShape.localTransformMatrix,
              translate(0, 0, configuration.hoverLift)
            ),
            parent: null, // consider linking to proper parent, eg. for more regular typing (ie. all shapes have all props)
          },
        ]
      : [];
  }
)(configuration, hoveredShape, selectedPrimaryShapeIds, draggedShape);

// Once the interaction is over, ensure that the shape stays put where the constraint led it - distance is no longer relevant
// Note that this is what standard software (Adobe Illustrator, Google Slides, PowerPoint, Sketch etc.) do, but it's in
// stark contrast with the concept of StickyLines - whose central idea is that constraints remain applied until explicitly

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

const groupAction = select(action => {
  const event = action && action.event;
  return event === 'group' || event === 'ungroup' ? event : null;
})(actionEvent);

const grouping = select(getGrouping)(
  configuration,
  constrainedShapesWithPreexistingAnnotations,
  selectedShapes,
  groupAction
);

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

const cursor = select(getCursor)(configuration, focusedShape, draggedPrimaryShape);

// this is the core scenegraph update invocation: upon new cursor position etc. emit the new scenegraph
// it's _the_ state representation (at a PoC level...) comprising of transient properties eg. draggedShape, and the
// collection of shapes themselves
export const nextScene = select(
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
