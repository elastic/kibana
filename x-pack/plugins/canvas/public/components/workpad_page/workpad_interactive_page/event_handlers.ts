/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  useCallback,
  useMemo,
  MouseEvent as ReactMouseEvent,
  WheelEvent as ReactWheelEvent,
} from 'react';
import { CommitFn } from '../../../lib/aeroelastic';
import { WORKPAD_CONTAINER_ID } from '../../workpad_app/workpad_app.component';

type CanvasOriginFn = () => { left: number; top: number };

export interface Props {
  commit: CommitFn | undefined;
  canvasOrigin: CanvasOriginFn;
  zoomScale: number;
  canDragElement: (target: EventTarget | null) => boolean;
}

const isInCanvas = (target: EventTarget | null) =>
  target instanceof Element && target.closest(`#${WORKPAD_CONTAINER_ID}`);

const localMousePosition = (
  canvasOrigin: CanvasOriginFn,
  clientX: number,
  clientY: number,
  zoomScale = 1
) => {
  const { left, top } = canvasOrigin();
  return {
    // commit unscaled coordinates
    x: (clientX - left) / zoomScale,
    y: (clientY - top) / zoomScale,
  };
};

const resetHandler = () => {
  window.onmousemove = null;
  window.onmouseup = null;
};

const setupHandler = (commit: CommitFn, canvasOrigin: CanvasOriginFn, zoomScale?: number) => {
  // Ancestor has to be identified on setup, rather than 1st interaction, otherwise events may be triggered on
  // DOM elements that had been removed: kibana-canvas github issue #1093

  window.onmousemove = ({
    buttons,
    clientX,
    clientY,
    altKey,
    metaKey,
    shiftKey,
    ctrlKey,
    target,
  }: MouseEvent) => {
    if (!isInCanvas(target)) {
      return;
    }

    const { x, y } = localMousePosition(canvasOrigin, clientX, clientY, zoomScale);

    // only commits the cursor position if there's a way to latch onto x/y calculation (canvasOrigin is knowable)
    // or if left button is being held down (i.e. an element is being dragged)
    if (buttons === 1 || canvasOrigin) {
      commit('cursorPosition', { x, y, altKey, metaKey, shiftKey, ctrlKey });
    } else {
      // clears cursorPosition
      commit('cursorPosition', {});
    }
  };

  window.onmouseup = (e: MouseEvent) => {
    const { clientX, clientY, altKey, metaKey, shiftKey, ctrlKey, target } = e;

    if (!isInCanvas(target)) {
      return;
    }

    e.stopPropagation();
    const { x, y } = localMousePosition(canvasOrigin, clientX, clientY, zoomScale);
    commit('mouseEvent', { event: 'mouseUp', x, y, altKey, metaKey, shiftKey, ctrlKey });
    resetHandler();
  };
};

const handleMouseMove = (
  commit: CommitFn | undefined,
  {
    clientX,
    clientY,
    altKey,
    metaKey,
    shiftKey,
    ctrlKey,
    target,
  }: ReactMouseEvent | ReactWheelEvent,
  canvasOrigin: CanvasOriginFn,
  zoomScale?: number
) => {
  if (!isInCanvas(target)) {
    return;
  }

  const { x, y } = localMousePosition(canvasOrigin, clientX, clientY, zoomScale);

  if (commit) {
    commit('cursorPosition', { x, y, altKey, metaKey, shiftKey, ctrlKey });
  }
};

const handleMouseLeave = (commit: CommitFn | undefined, { buttons, target }: ReactMouseEvent) => {
  if (!isInCanvas(target)) {
    return;
  }

  if (buttons !== 1 && commit) {
    commit('cursorPosition', {}); // reset hover only if we're not holding down left key (ie. drag in progress)
  }
};

const handleMouseDown = (
  commit: CommitFn | undefined,
  e: ReactMouseEvent,
  canvasOrigin: CanvasOriginFn,
  zoomScale: number,
  allowDrag = true
) => {
  const { clientX, clientY, buttons, altKey, metaKey, shiftKey, ctrlKey, target } = e;

  if (!isInCanvas(target)) {
    return;
  }

  e.stopPropagation();
  if (buttons !== 1 || !commit) {
    resetHandler();
    return; // left-click only
  }

  if (allowDrag) {
    setupHandler(commit, canvasOrigin, zoomScale);
  }

  const { x, y } = localMousePosition(canvasOrigin, clientX, clientY, zoomScale);
  commit('mouseEvent', { event: 'mouseDown', x, y, altKey, metaKey, shiftKey, ctrlKey });

  if (!allowDrag) {
    commit('mouseEvent', { event: 'mouseUp', x, y, altKey, metaKey, shiftKey, ctrlKey });
  }
};

export const eventHandlers = {
  onMouseDown: (props: Props) => (e: ReactMouseEvent) =>
    handleMouseDown(
      props.commit,
      e,
      props.canvasOrigin,
      props.zoomScale,
      props.canDragElement(e.target)
    ),
  onMouseMove: (props: Props) => (e: ReactMouseEvent) =>
    handleMouseMove(props.commit, e, props.canvasOrigin, props.zoomScale),
  onMouseLeave: (props: Props) => (e: ReactMouseEvent) => handleMouseLeave(props.commit, e),
  onWheel: (props: Props) => (e: ReactWheelEvent) =>
    handleMouseMove(props.commit, e, props.canvasOrigin),
  resetHandler: () => () => resetHandler(),
};

export interface EventHandlers {
  onMouseDown: (e: ReactMouseEvent) => void;
  onMouseMove: (e: ReactMouseEvent) => void;
  onMouseLeave: (e: ReactMouseEvent) => void;
  onWheel: (e: ReactWheelEvent) => void;
  resetHandler: () => void;
}

export const useEventHandlers = ({
  commit,
  canvasOrigin,
  zoomScale,
  canDragElement,
}: Props): EventHandlers => {
  const onMouseDown = useCallback(
    (e: ReactMouseEvent) => {
      handleMouseDown(commit, e, canvasOrigin, zoomScale, canDragElement(e.target));
    },
    [commit, canvasOrigin, zoomScale, canDragElement]
  );

  const onMouseMove = useCallback(
    (e: ReactMouseEvent) => {
      handleMouseMove(commit, e, canvasOrigin, zoomScale);
    },
    [commit, canvasOrigin, zoomScale]
  );

  const onMouseLeave = useCallback((e: ReactMouseEvent) => handleMouseLeave(commit, e), [commit]);
  const onWheel = useCallback(
    (e: ReactWheelEvent) => handleMouseMove(commit, e, canvasOrigin),
    [commit, canvasOrigin]
  );

  const resetHandlerCallback = useCallback(() => resetHandler(), []);

  return useMemo(
    () => ({
      onMouseDown,
      onMouseMove,
      onMouseLeave,
      onWheel,
      resetHandler: resetHandlerCallback,
    }),
    [onMouseDown, onMouseMove, onMouseLeave, onWheel, resetHandlerCallback]
  );
};
