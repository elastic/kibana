/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useCallback, useState, useEffect, useRef, useLayoutEffect } from 'react';
import { useSelector } from 'react-redux';
import ResizeObserver from 'resize-observer-polyfill';
import { Matrix3 } from '../types';
import { useResolverDispatch } from './use_resolver_dispatch';
import * as selectors from '../store/selectors';

// TODO, consider this design:
// receive camera state, don't use `useSelector`. make `camera` a top level module that exports hook, reducer, selectors, types, etc.
// could be a good separation of concerns. could be premature tho.
export function useCamera(): {
  ref: (node: HTMLDivElement | null) => void;
  onMouseDown: React.MouseEventHandler<HTMLElement>;
  projectionMatrix: Matrix3;
} {
  const dispatch = useResolverDispatch();

  const [ref, setRef] = useState<null | HTMLDivElement>(null);

  /**
   * The position of a thing, as a `Vector2`, is multiplied by the projection matrix
   * to determine where it belongs on the screen.
   * The projection matrix changes over time if the camera is currently animating.
   */
  const projectionMatrixAtTime = useSelector(selectors.projectionMatrix);

  const projectionMatrixAtTimeRef = useRef<typeof projectionMatrixAtTime>();

  /**
   * The projection matrix is stateful, depending on the current time.
   * When the projection matrix changes, the component should be rerendered.
   */
  const [projectionMatrix, setProjectionMatrix] = useState<Matrix3>(
    projectionMatrixAtTime(new Date())
  );

  const rafRef = useRef<number>();

  const userIsPanning = useSelector(selectors.userIsPanning);
  const isAnimatingAtTime = useSelector(selectors.isAnimating);
  const isAnimatingAtTimeRef = useRef<typeof isAnimatingAtTime>();

  const [elementBoundingClientRect, clientRectCallback] = useAutoUpdatingClientRect();

  /**
   * For an event with clientX and clientY, return [clientX, clientY] - the top left corner of the `ref` element
   */
  const relativeCoordinatesFromMouseEvent = useCallback(
    (event: { clientX: number; clientY: number }): null | [number, number] => {
      if (elementBoundingClientRect === null) {
        return null;
      }
      return [
        event.clientX - elementBoundingClientRect.x,
        event.clientY - elementBoundingClientRect.y,
      ];
    },
    [elementBoundingClientRect]
  );

  const handleMouseDown = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const maybeCoordinates = relativeCoordinatesFromMouseEvent(event);
      if (maybeCoordinates !== null) {
        dispatch({
          type: 'userStartedPanning',
          payload: { screenCoordinates: maybeCoordinates, time: new Date() },
        });
      }
    },
    [dispatch, relativeCoordinatesFromMouseEvent]
  );

  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      const maybeCoordinates = relativeCoordinatesFromMouseEvent(event);
      if (maybeCoordinates) {
        dispatch({
          type: 'userMovedPointer',
          payload: {
            screenCoordinates: maybeCoordinates,
            time: new Date(),
          },
        });
      }
    },
    [dispatch, relativeCoordinatesFromMouseEvent]
  );

  const handleMouseUp = useCallback(() => {
    if (userIsPanning) {
      dispatch({
        type: 'userStoppedPanning',
      });
    }
  }, [dispatch, userIsPanning]);

  const handleWheel = useCallback(
    (event: WheelEvent) => {
      if (
        elementBoundingClientRect !== null &&
        event.ctrlKey &&
        event.deltaY !== 0 &&
        event.deltaMode === 0
      ) {
        event.preventDefault();
        dispatch({
          type: 'userZoomed',
          payload: {
            /**
             * we use elementBoundingClientRect to interpret pixel deltas as a fraction of the element's height
             * when pinch-zooming in on a mac, deltaY is a negative number but we want the payload to be positive
             */
            zoomChange: event.deltaY / -elementBoundingClientRect.height,
            time: new Date(),
          },
        });
      }
    },
    [elementBoundingClientRect, dispatch]
  );

  const refCallback = useCallback(
    (node: null | HTMLDivElement) => {
      setRef(node);
      clientRectCallback(node);
    },
    [clientRectCallback]
  );

  useEffect(() => {
    window.addEventListener('mouseup', handleMouseUp, { passive: true });
    return () => {
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseUp]);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [handleMouseMove]);

  /**
   * Register an event handler directly on `elementRef` for the `wheel` event, with no options
   * React sets native event listeners on the `window` and calls provided handlers via event propagation.
   * As of Chrome 73, `'wheel'` events on `window` are automatically treated as 'passive'.
   * If you don't need to call `event.preventDefault` then you should use regular React event handling instead.
   */
  useEffect(() => {
    if (ref !== null) {
      ref.addEventListener('wheel', handleWheel);
      return () => {
        ref.removeEventListener('wheel', handleWheel);
      };
    }
  }, [ref, handleWheel]);

  useLayoutEffect(() => {
    projectionMatrixAtTimeRef.current = projectionMatrixAtTime;
  }, [projectionMatrixAtTime]);

  useLayoutEffect(() => {
    isAnimatingAtTimeRef.current = isAnimatingAtTime;
  }, [isAnimatingAtTime]);

  /**
   * Keep the projection matrix state in sync with the selector.
   * This isn't needed during animation.
   */
  useLayoutEffect(() => {
    setProjectionMatrix(projectionMatrixAtTime(new Date()));
    // TODO why does projectionMatrixAtTime change when the mouse moves???
  }, [projectionMatrixAtTime]);

  /**
   * For some reason, referring to `projectionMatrixAtTime` in here didn't work. Several tutorials
   * I've found mention something similar to this problem. They use a ref
   * to refer to values that update during rerenders. Not sure: https://css-tricks.com/using-requestanimationframe-with-react-hooks/
   */
  useLayoutEffect(() => {
    const startDate = new Date();
    if (isAnimatingAtTime(startDate)) {
      const handleFrame = () => {
        const date = new Date();
        if (projectionMatrixAtTimeRef.current !== undefined) {
          // since we set projectionMatrix, we really should not update when projection matrix is changed. use a ref to avoid
          // this terrible loop
          // TODO better comment
          setProjectionMatrix(projectionMatrixAtTimeRef.current(date));
        }
        if (isAnimatingAtTimeRef.current !== undefined && isAnimatingAtTimeRef.current(date)) {
          rafRef.current = requestAnimationFrame(handleFrame);
        } else {
          rafRef.current = undefined;
        }
      };
      rafRef.current = requestAnimationFrame(handleFrame);
      return () => {
        if (rafRef.current !== undefined) {
          cancelAnimationFrame(rafRef.current);
        }
      };
    }
  }, [isAnimatingAtTime]);

  useEffect(() => {
    if (elementBoundingClientRect !== null) {
      dispatch({
        type: 'userSetRasterSize',
        payload: [elementBoundingClientRect.width, elementBoundingClientRect.height],
      });
    }
  }, [dispatch, elementBoundingClientRect]);

  return {
    ref: refCallback,
    onMouseDown: handleMouseDown,
    projectionMatrix,
  };
}

/**
 * Returns a nullable DOMRect and a ref callback. Pass the refCallback to the
 * `ref` property of a native element and this hook will return a DOMRect for
 * it by calling `getBoundingClientRect`. This hook will observe the element
 * with a resize observer and call getBoundingClientRect again after resizes.
 *
 * Note that the changes to the position of the element aren't automatically
 * tracked. So if the element's position moves for some reason, be sure to
 * handle that.
 */
function useAutoUpdatingClientRect(): [DOMRect | null, (node: Element | null) => void] {
  const [rect, setRect] = useState<DOMRect | null>(null);
  const nodeRef = useRef<Element | null>(null);
  const ref = useCallback((node: Element | null) => {
    nodeRef.current = node;
    if (node !== null) {
      setRect(node.getBoundingClientRect());
    }
  }, []);
  useEffect(() => {
    if (nodeRef.current !== null) {
      const resizeObserver = new ResizeObserver(entries => {
        if (nodeRef.current !== null && nodeRef.current === entries[0].target) {
          setRect(nodeRef.current.getBoundingClientRect());
        }
      });
      resizeObserver.observe(nodeRef.current);
      return () => {
        resizeObserver.disconnect();
      };
    }
  }, [nodeRef]);
  return [rect, ref];
}
