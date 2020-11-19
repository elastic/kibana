/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import d3 from 'd3';
import { useCallback } from 'react';
import { DraggableId, FluidDragActions, Position, SensorAPI } from 'react-beautiful-dnd';

import { IS_DRAGGING_CLASS_NAME } from '../components/drag_and_drop/helpers';
import { HIGHLIGHTED_DROP_TARGET_CLASS_NAME } from '../../timelines/components/timeline/data_providers/empty';
import { EMPTY_PROVIDERS_GROUP_CLASS_NAME } from '../../timelines/components/timeline/data_providers/providers';

let _sensorApiSingleton: SensorAPI;

/**
 * This hook is passed (in an array) to the `sensors` prop of the
 * `react-beautiful-dnd` `DragDropContext` component. Example:
 *
 * ```
       <DragDropContext onDragEnd={onDragEnd} sensors={[useAddToTimelineSensor]}>
        {children}
      </DragDropContext>*
 * ```
 *
 * As a side effect of registering this hook with the `DragDropContext`,
 * the `SensorAPI` singleton is initialized. This singleton is used
 * by the `useAddToTimeline` hook.
 */
export const useAddToTimelineSensor = (api: SensorAPI) => {
  _sensorApiSingleton = api;
};

/**
 * Returns the position of the specified element
 */
const getPosition = (element: Element): Position => {
  const rect = element.getBoundingClientRect();

  return { x: rect.left, y: rect.top };
};

/**
 * Returns the position of one of the following timeline drop targets
 * (in the following order of preference):
 * 1) The "Drop anything highlighted..." drop target
 * 2) The persistent "empty" data provider group drop target
 * 3) `null`, because none of the above targets exist (an error state)
 */
export const getDropTargetCoordinate = (): Position | null => {
  // The placeholder in the "Drop anything highlighted here to build an OR query":
  const highlighted = document.querySelector(`.${HIGHLIGHTED_DROP_TARGET_CLASS_NAME}`);

  if (highlighted != null) {
    return getPosition(highlighted);
  }

  // If at least one provider has been added to the timeline, the "Drop anything
  // highlighted..." drop target won't be visible, so we need to drop into the
  // empty group instead:
  const emptyGroup = document.querySelector(`.${EMPTY_PROVIDERS_GROUP_CLASS_NAME}`);

  if (emptyGroup != null) {
    return getPosition(emptyGroup);
  }

  return null;
};

/**
 * Returns the coordinates of the specified draggable
 */
export const getDraggableCoordinate = (draggableId: DraggableId): Position | null => {
  // The placeholder in the "Drop anything highlighted here to build an OR query":
  const draggable = document.querySelector(`[data-rbd-draggable-id="${draggableId}"]`);

  if (draggable != null) {
    return getPosition(draggable);
  }

  return null;
};

/**
 * Animates a draggable via `requestAnimationFrame`
 */
export const animate = ({
  drag,
  fieldName,
  values,
}: {
  drag: FluidDragActions;
  fieldName: string;
  values: Position[];
}) => {
  requestAnimationFrame(() => {
    if (values.length === 0) {
      setTimeout(() => drag.drop(), 0); // schedule the drop the next time around
      return;
    }

    drag.move(values[0]);

    animate({
      drag,
      fieldName,
      values: values.slice(1),
    });
  });
};

/**
 * This hook animates a draggable data provider to the timeline
 */
export const useAddToTimeline = ({
  draggableId,
  fieldName,
}: {
  draggableId: DraggableId | undefined;
  fieldName: string;
}) => {
  const startDragToTimeline = useCallback(() => {
    if (_sensorApiSingleton == null) {
      throw new TypeError(
        'To use this hook, the companion `useAddToTimelineSensor` hook must be registered in the `sensors` prop of the `DragDropContext`.'
      );
    }

    if (draggableId == null) {
      // A request to start the animation should not have been made, because
      // no draggableId was provided
      return;
    }

    // add the dragging class, which will show the flyout data providers (if the flyout button is being displayed):
    document.body.classList.add(IS_DRAGGING_CLASS_NAME);

    // start the animation after the flyout data providers are visible:
    setTimeout(() => {
      const draggableCoordinate = getDraggableCoordinate(draggableId);
      const dropTargetCoordinate = getDropTargetCoordinate();
      const preDrag = _sensorApiSingleton.tryGetLock(draggableId);

      if (draggableCoordinate != null && dropTargetCoordinate != null && preDrag != null) {
        const steps = 10;
        const points = d3.range(steps + 1).map((i) => ({
          x: d3.interpolate(draggableCoordinate.x, dropTargetCoordinate.x)(i * 0.1),
          y: d3.interpolate(draggableCoordinate.y, dropTargetCoordinate.y)(i * 0.1),
        }));

        const drag = preDrag.fluidLift(draggableCoordinate);
        animate({
          drag,
          fieldName,
          values: points,
        });
      } else {
        document.body.classList.remove(IS_DRAGGING_CLASS_NAME); // it was not possible to perform a drag and drop
      }
    }, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [_sensorApiSingleton, draggableId]);

  return startDragToTimeline;
};
