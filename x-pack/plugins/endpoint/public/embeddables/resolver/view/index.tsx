/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useState, useEffect, useRef, useMemo } from 'react';
import { Store } from 'redux';
import { Provider, useSelector, useDispatch } from 'react-redux';
import styled from 'styled-components';
import { applyMatrix3 } from '../lib/vector2';
import { ResolverState, ResolverAction, Vector2 } from '../types';
import * as selectors from '../store/selectors';
import { DiagnosticDot } from './diagnostic_dot';

export const AppRoot = React.memo(({ store }: { store: Store<ResolverState, ResolverAction> }) => {
  return (
    <Provider store={store}>
      <Diagnostic />
    </Provider>
  );
});

const Diagnostic = styled(
  React.memo(({ className }: { className?: string }) => {
    const dispatch: (action: ResolverAction) => unknown = useDispatch();

    const [ref, setRef] = useState<null | HTMLDivElement>(null);

    const userIsPanning = useSelector(selectors.userIsPanning);

    const [elementBoundingClientRect, clientRectCallback] = useAutoUpdatingClientRect();

    const relativeCoordinatesFromMouseEvent = useCallback(
      (event: { clientX: number; clientY: number }): null | [number, number] => {
        if (elementBoundingClientRect === undefined) {
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
      if (elementBoundingClientRect !== undefined) {
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
            payload: maybeCoordinates,
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
            payload: maybeCoordinates,
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
        // we use elementBoundingClientRect to interpret pixel deltas as a fraction of the element's height
        if (
          elementBoundingClientRect !== undefined &&
          event.ctrlKey &&
          event.deltaY !== 0 &&
          event.deltaMode === 0
        ) {
          event.preventDefault();
          dispatch({
            type: 'userZoomed',
            payload: (-2 * event.deltaY) / elementBoundingClientRect.height,
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

    const refCallback = useCallback(
      (node: null | HTMLDivElement) => {
        setRef(node);
        clientRectCallback(node);
      },
      [clientRectCallback]
    );

    useNonPassiveWheelHandler(handleWheel, ref);

    return (
      <div className={className} ref={refCallback} onMouseDown={handleMouseDown}>
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

/**
 * Register an event handler directly on `elementRef` for the `wheel` event, with no options
 * React sets native event listeners on the `window` and calls provided handlers via event propagation.
 * As of Chrome 73, `'wheel'` events on `window` are automatically treated as 'passive'.
 * If you don't need to call `event.preventDefault` then you should use regular React event handling instead.
 */
function useNonPassiveWheelHandler(
  handler: (event: WheelEvent) => void,
  elementRef: HTMLElement | null
) {
  useEffect(() => {
    if (elementRef !== null) {
      elementRef.addEventListener('wheel', handler);
      return () => {
        elementRef.removeEventListener('wheel', handler);
      };
    }
  }, [elementRef, handler]);
}
