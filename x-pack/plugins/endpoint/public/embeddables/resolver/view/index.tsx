/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useState, useEffect, useRef, useMemo } from 'react';
import { Store } from 'redux';
import { Provider, useSelector, useDispatch } from 'react-redux';
import { Dispatch } from 'redux';
import styled from 'styled-components';
import { ResolverState, ResolverAction, Vector2 } from '../types';
import * as selectors from '../store/selectors';

export const AppRoot = React.memo(({ store }: { store: Store<ResolverState, ResolverAction> }) => {
  return (
    <Provider store={store}>
      <Diagnostic />
    </Provider>
  );
});

const useResolverDispatch = () => useDispatch<Dispatch<ResolverAction>>();

const Diagnostic = styled(
  React.memo(({ className }: { className?: string }) => {
    const userIsPanning = useSelector(selectors.userIsPanning);

    const [elementBoundingClientRect, clientRectCallbackFunction] = useAutoUpdatingClientRect();

    const dispatch = useResolverDispatch();

    const rasterToWorld = useSelector(selectors.rasterToWorld);

    const worldPositionFromClientPosition = useCallback(
      (clientPosition: Vector2): Vector2 | null => {
        if (elementBoundingClientRect === undefined) {
          return null;
        }
        return rasterToWorld([
          clientPosition[0] - elementBoundingClientRect.x,
          clientPosition[1] - elementBoundingClientRect.y,
        ]);
      },
      [rasterToWorld, elementBoundingClientRect]
    );

    useEffect(() => {
      if (elementBoundingClientRect !== undefined) {
        dispatch({
          type: 'userSetRasterSize',
          payload: [elementBoundingClientRect.width, elementBoundingClientRect.height],
        });
      }
    }, [elementBoundingClientRect, dispatch]);

    const handleMouseDown = useCallback(
      (event: React.MouseEvent<HTMLDivElement>) => {
        dispatch({
          type: 'userStartedPanning',
          // TODO why is this negative?
          payload: [event.clientX, -event.clientY],
        });
      },
      [dispatch]
    );

    const handleMouseMove = useCallback(
      (event: React.MouseEvent<HTMLDivElement>) => {
        if (event.buttons === 1 && userIsPanning) {
          dispatch({
            type: 'userContinuedPanning',
            // TODO why is this negative?
            payload: [event.clientX, -event.clientY],
          });
        }
        // TODO, don't fire two actions here. make userContinuedPanning also pass world position
        const maybeClientWorldPosition = worldPositionFromClientPosition([
          event.clientX,
          event.clientY,
        ]);
        if (maybeClientWorldPosition !== null) {
          dispatch({
            type: 'userFocusedOnWorldCoordinates',
            payload: maybeClientWorldPosition,
          });
        }
      },
      [dispatch, userIsPanning, worldPositionFromClientPosition]
    );

    const handleMouseUp = useCallback(() => {
      if (userIsPanning) {
        dispatch({
          type: 'userStoppedPanning',
        });
      }
    }, [dispatch, userIsPanning]);

    const handleWheel = useCallback(
      (event: React.WheelEvent<HTMLDivElement>) => {
        // we use elementBoundingClientRect to interpret pixel deltas as a fraction of the element's height
        if (
          elementBoundingClientRect !== undefined &&
          event.ctrlKey &&
          event.deltaY !== 0 &&
          event.deltaMode === 0
        ) {
          dispatch({
            type: 'userZoomed',
            payload: event.deltaY / elementBoundingClientRect.height,
          });
        }
      },
      [elementBoundingClientRect, dispatch]
    );

    // TODO, handle mouse up when no longer on element or event window. ty

    const dotPositions = useMemo(
      (): ReadonlyArray<readonly [number, number]> => [
        [0, 0],
        [0, 100],
        [100, 100],
        [100, 0],
        [100, -100],
        [0, -100],
        [-100, -100],
        [-100, 0],
        [-100, 100],
      ],
      []
    );

    return (
      <div
        className={className}
        ref={clientRectCallbackFunction}
        onMouseMove={handleMouseMove}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
      >
        {dotPositions.map((worldPosition, index) => (
          <DiagnosticDot key={index} worldPosition={worldPosition} />
        ))}
      </div>
    );
  })
)`
  /* TODO, this is not a concern of Resolver. its parent needs to do this probably? */
  display: flex;
  flex-grow: 1;
  position: relative;
`;

/**
 * Returns a DOMRect sometimes, and a `ref` callback. Put the `ref` as the `ref` property of an element, and
 * DOMRect will be the result of getBoundingClientRect on it.
 * Updates automatically when the window resizes. TODO: better Englishe here
 */
function useAutoUpdatingClientRect(): [DOMRect | undefined, (node: Element | null) => void] {
  const [rect, setRect] = useState<DOMRect>();
  const nodeRef = useRef<Element>();

  const ref = useCallback((node: Element | null) => {
    // why do we have to deal /w both null and undefined? TODO
    nodeRef.current = node === null ? undefined : node;
    if (node !== null) {
      setRect(node.getBoundingClientRect());
    }
  }, []);

  // TODO, this isn't really a concern of Resolver.
  // The parent should inform resolver that it needs to rerender
  useEffect(() => {
    window.addEventListener('resize', handler, { passive: true });
    return () => {
      window.removeEventListener('resize', handler);
    };
    function handler() {
      if (nodeRef.current !== undefined) {
        setRect(nodeRef.current.getBoundingClientRect());
      }
    }
  }, []);
  return [rect, ref];
}

const DiagnosticDot = styled(
  React.memo(({ className, worldPosition }: { className?: string; worldPosition: Vector2 }) => {
    const worldToRaster = useSelector(selectors.worldToRaster);
    const [left, top] = worldToRaster(worldPosition);
    const style = {
      left: (left - 20).toString() + 'px',
      top: (top - 20).toString() + 'px',
    };
    return (
      <span className={className} style={style}>
        x: {worldPosition[0]}
        <br />
        y: {worldPosition[1]}
      </span>
    );
  })
)`
  position: absolute;
  width: 40px;
  height: 40px;
  text-align: left;
  font-size: 10px;
  user-select: none;
  border: 1px solid black;
  box-sizing: border-box;
  border-radius: 10%;
  padding: 4px;
  white-space: nowrap;
`;
