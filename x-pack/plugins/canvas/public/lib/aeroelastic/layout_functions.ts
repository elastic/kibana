/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * Pure calculations
 */

// returns the currently dragged shape, or a falsey value otherwise
export const draggingShape = ({ draggedShape, shapes }, hoveredShape, down, mouseDowned) => {
  const dragInProgress =
    down &&
    shapes.reduce((prev, next) => prev || (draggedShape && next.id === draggedShape.id), false);
  const result = (dragInProgress && draggedShape) || (down && mouseDowned && hoveredShape);
  return result;
};
// the currently dragged shape is considered in-focus; if no dragging is going on, then the hovered shape
export const getFocusedShape = (draggedShape, hoveredShape) => draggedShape || hoveredShape;// focusedShapes has updated position etc. information while focusedShape may have stale position
export const getFocusedShapes = (shapes, focusedShape) =>
  shapes.filter(shape => focusedShape && shape.id === focusedShape.id);
export const getAlterSnapGesture = metaHeld => (metaHeld ? ['relax'] : []);
export const initialTransformTuple = {
  deltaX: 0,
  deltaY: 0,
  transform: null,
  cumulativeTransform: null,
};
export const getMouseTransformGesturePrev = ({mouseTransformState}) => mouseTransformState || initialTransformTuple;
