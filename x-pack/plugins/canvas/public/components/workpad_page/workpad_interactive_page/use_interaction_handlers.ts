/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, MutableRefObject, useLayoutEffect } from 'react';
import { CommitFn } from '../../../lib/aeroelastic';
import { WORKPAD_CONTAINER_ID } from '../../workpad_app/workpad_app.component';

const BUFFER = 3;

// Determines if the target of an event is a child of the Workpad container.
const isContainedByCanvas = (target: EventTarget | null) =>
  target instanceof Element && target.closest(`#${WORKPAD_CONTAINER_ID}`);

const hasLeftContainer = (
  event: MouseEvent | React.MouseEvent,
  boundary: HTMLElement,
  zoomScale: number
) => {
  const { x, y } = getMousePosition(event, boundary, zoomScale);
  const { height, width } = boundary.getBoundingClientRect();

  return x <= BUFFER || y <= BUFFER || x >= width - BUFFER || y >= height - BUFFER;
};

// Get the relative position of the mouse from the top left corner of a given container.
const getMousePosition = (
  event: MouseEvent | React.MouseEvent,
  container: HTMLElement,
  zoomScale: number
) => {
  const { clientX, clientY } = event;
  const { left, top } = container.getBoundingClientRect();

  return {
    x: (clientX - left) / zoomScale,
    y: (clientY - top) / zoomScale,
  };
};

/**
 * Parameters to control the behavior of the interaction handlers.
 */
export interface HandlerParameters {
  /**
   * A function to check if an event target is eligible to be dragged.  This is useful for
   * elements whose contents have custom drag behaviors, (like Maps embeddables).
   */
  canDragElement?: (target: EventTarget | null) => boolean;

  /** The aeroelastic event commit function. */
  commit: CommitFn;

  /** The current zoom scale of the workpad. */
  zoomScale: number;
}

/**
 * This hook provides event handlers for any container that wants to track
 * interactions through aeroelastic.
 *
 * @param pageRef A ref to the outmost container to use to track interactions.
 * @param stageRef A ref to the element containing interaction targets as immediate children.
 * @param parameters Parameters to control the behavior of the interaction handlers. (see HandlerParameters)
 */
export const useInteractionHandlers = (
  pageRef: MutableRefObject<HTMLElement | null>,
  stageRef: MutableRefObject<HTMLElement | null>,
  boundaryRef: MutableRefObject<HTMLElement | null>,
  { zoomScale, commit, canDragElement }: HandlerParameters
) => {
  // Keep track of the page container for the handlers we're going to provide.
  const [pageContainer, setPageContainer] = useState<HTMLElement | null>(null);

  // We're going to monitor window and DOM node events, so we need to use a layout effect.
  useLayoutEffect(() => {
    const { current: currentPage } = pageRef;
    const { current: currentStage } = stageRef;
    const { current: currentBoundary } = boundaryRef;

    // If the refs aren't available, we're not ready to handle interactions.
    if (!currentPage || !currentStage || !currentBoundary) {
      return;
    }

    setPageContainer(currentPage);

    // When the mouse moves in the window, commit the cursor position to aeroelastic.
    const onWindowMouseMove = (event: MouseEvent) => {
      const { target, buttons, ...rest } = event;

      // If we're not dragging an element, but the stage has the dragging class, we likely entered
      // a state where the mouse was down but left the window entirely, which means we need to clean up.
      // This is an edge case, but this check is not expensive since we check for the left button first.
      if (buttons !== 1 && currentStage.classList.contains('canvas-dragging')) {
        currentStage.classList.remove('canvas-dragging');
        currentStage.removeEventListener('mousemove', onContainerDrag, { capture: true });
      }

      // If we are currently dragging, and the mouse cursor has left the interaction boundary,
      // we need to reset and stop everything...
      if (buttons === 1 && hasLeftContainer(event, currentBoundary, zoomScale)) {
        // ...remove the current dragging listener...
        currentStage.removeEventListener('mousemove', onContainerDrag, { capture: true });

        // ...log a mouse-up event to aeroelastic...
        const { x, y } = getMousePosition(event, currentPage, zoomScale);
        const { altKey, metaKey, shiftKey, ctrlKey } = event;
        commit('mouseEvent', { event: 'mouseUp', x, y, altKey, metaKey, shiftKey, ctrlKey });

        // ...stop the drag.
        currentStage.classList.remove('canvas-dragging');
        return;
      }

      const canDrag = canDragElement || (() => true);

      // If the target is not allowed to be dragged, reset the cursor position.
      if (!canDrag(target)) {
        commit('cursorPosition', {});
        return;
      }

      const { x, y } = getMousePosition(event, currentPage, zoomScale);
      const { altKey, metaKey, shiftKey, ctrlKey } = rest;
      commit('cursorPosition', { x, y, altKey, metaKey, shiftKey, ctrlKey });
    };

    // Step 2: when the mouse moves in the stage, add a class that will indicate a drag
    // is occurring.  We'll use this class to apply `pointer-events: none` to elements,
    // or other mitigation before any interactions are triggered on the targets.
    const onContainerDrag = () => {
      currentStage.classList.add('canvas-dragging');
      currentStage.removeEventListener('mousemove', onContainerDrag, { capture: true });
    };

    // Step 3: any time the mouse button is released, remove the class.
    const onWindowMouseUp = () => {
      if (currentStage.classList.contains('canvas-dragging')) {
        currentStage.classList.remove('canvas-dragging');
      }
    };

    // Step 1: when a mouse button is clicked, we need to start listening for mouse moves.
    const onContainerMouseDown = (event: MouseEvent) => {
      if (event.buttons === 1) {
        // Capture mouse move events on the container before they reach their target.
        currentStage.addEventListener('mousemove', onContainerDrag, { capture: true });
      }
    };

    // Add the event listeners.
    currentStage.addEventListener('mousedown', onContainerMouseDown, { capture: true });
    window.addEventListener('mouseup', onWindowMouseUp, { capture: true });
    window.addEventListener('mousemove', onWindowMouseMove);

    // Remove the event listeners when the component is unmounted.
    return () => {
      currentStage.removeEventListener('mousedown', onContainerMouseDown, { capture: true });
      window.removeEventListener('mouseup', onWindowMouseUp, { capture: true });
      window.removeEventListener('mousemove', onWindowMouseMove);
    };
  }, [canDragElement, commit, pageRef, boundaryRef, setPageContainer, stageRef, zoomScale]);

  // If we don't have an available page container, return no handlers.
  if (!pageContainer) {
    return {};
  }

  const onMouseLeave = ({ buttons }: React.MouseEvent) => {
    // reset the cursor position only if we're not holding down left key (ie. drag in progress)
    if (buttons !== 1) {
      commit('cursorPosition', {});
    }
  };

  const onMouseDown = (event: React.MouseEvent) => {
    const { target, buttons, ...rest } = event;

    // If the target is not contained by the container, or the button is not the left button,
    // reset the cursor position.
    //
    // Don't commit the mouse down event to Aeroelastic.
    //
    // This is useful for things like flyouts and portals that are children of the document,
    // rather than that the workpad.
    if (!isContainedByCanvas(target) || buttons !== 1) {
      commit('cursorPosition', {});
      return;
    }

    event.stopPropagation();
    const { x, y } = getMousePosition(event, pageContainer, zoomScale);
    const { altKey, metaKey, shiftKey, ctrlKey } = rest;
    commit('mouseEvent', { event: 'mouseDown', x, y, altKey, metaKey, shiftKey, ctrlKey });
  };

  const onMouseUp = (event: React.MouseEvent) => {
    const { target, ...rest } = event;

    // If the target is not contained by the container, reset the cursor position.
    // Don't commit the mouse up event to Aeroelastic.
    if (!isContainedByCanvas(target)) {
      commit('cursorPosition', {});
      return;
    }

    event.stopPropagation();
    const { x, y } = getMousePosition(event, pageContainer, zoomScale);
    const { altKey, metaKey, shiftKey, ctrlKey } = rest;
    commit('mouseEvent', { event: 'mouseUp', x, y, altKey, metaKey, shiftKey, ctrlKey });
  };

  return { onMouseDown, onMouseUp, onMouseLeave };
};
