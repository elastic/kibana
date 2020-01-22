/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useCallback, useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { Matrix3 } from '../types';
import { useResolverDispatch } from './use_resolver_dispatch';
import * as selectors from '../store/selectors';
import { useAutoUpdatingClientRect } from './use_autoupdating_client_rect';
import { useNonPassiveWheelHandler } from './use_nonpassive_wheel_handler';

export function useCamera(): {
  ref: (node: HTMLDivElement | null) => void;
  onMouseDown: React.MouseEventHandler<HTMLElement>;
  projectionMatrix: Matrix3;
} {
  const dispatch = useResolverDispatch();

  const [ref, setRef] = useState<null | HTMLDivElement>(null);

  const userIsPanning = useSelector(selectors.userIsPanning);

  const [elementBoundingClientRect, clientRectCallback] = useAutoUpdatingClientRect();

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

  useEffect(() => {
    if (elementBoundingClientRect !== null) {
      dispatch({
        type: 'userSetRasterSize',
        payload: [elementBoundingClientRect.width, elementBoundingClientRect.height],
      });
    }
  }, [dispatch, elementBoundingClientRect]);

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

  const refCallback = useCallback(
    (node: null | HTMLDivElement) => {
      setRef(node);
      clientRectCallback(node);
    },
    [clientRectCallback]
  );

  useNonPassiveWheelHandler(handleWheel, ref);

  const projectionMatrixAtTime = useSelector(selectors.projectionMatrix);

  const [projectionMatrix, setProjectionMatrix] = useState<Matrix3>(
    projectionMatrixAtTime(new Date())
  );
  const [time, setTime] = useState<Date>(new Date());
  const rafRef = useRef<number>();
  useEffect(() => {
    const handleFrame = () => {
      setTime(new Date());
      rafRef.current = requestAnimationFrame(handleFrame);
    };
    handleFrame();
    return () => {
      if (rafRef.current !== undefined) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);
  useEffect(() => {
    setProjectionMatrix(projectionMatrixAtTime(time));
  }, [projectionMatrixAtTime, time]);

  /*
  useEffect(
    function updateProjectionMatrixLoop() {
      // console.count('updateProjectionMatrixLoop');
      let animationFrameReference = requestAnimationFrame(function handleAnimationFrame() {
        // console.count('handleAnimationFrame');
        setProjectionMatrix(projectionMatrixAtTime(new Date()));
        animationFrameReference = requestAnimationFrame(handleAnimationFrame);
      });
      return function cancelProjectionMatrixUpdateLoop() {
        // console.count('cancelAnimationFrame');
        cancelAnimationFrame(animationFrameReference);
      };
    },
    [projectionMatrixAtTime]
  );
  */

  return {
    ref: refCallback,
    onMouseDown: handleMouseDown,
    projectionMatrix,
  };
}
