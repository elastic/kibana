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
import { clamp } from '../lib/math';

export const AppRoot: React.FC<{
  store: Store<ResolverState, ResolverAction>;
}> = React.memo(({ store }) => {
  return (
    <Provider store={store}>
      <Diagnostic />
    </Provider>
  );
});

const useResolverDispatch = () => useDispatch<Dispatch<ResolverAction>>();

const Diagnostic = styled(
  React.memo(({ className }: { className?: string }) => {
    const scale = useSelector(selectors.scale);
    const userIsPanning = useSelector(selectors.userIsPanning);

    const [elementBoundingClientRect, clientRectCallbackFunction] = useAutoUpdatingClientRect();

    const dispatch = useResolverDispatch();

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
            payload: [event.clientX, -event.clientY],
          });
        }
      },
      [dispatch, userIsPanning]
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
        if (event.ctrlKey) {
          /*
           * Clamp amount at ±10 percent per action.
           * Determining the scale of the deltaY is difficult due to differences in UA.
           */
          const scaleDelta = clamp(event.deltaY, -0.1, 0.1);
          dispatch({
            type: 'userScaled',
            payload: [scale[0] + scaleDelta, scale[1] + scaleDelta],
          });
        }
      },
      [scale, dispatch]
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
        <DiagnosticDot worldPosition={useMemo(() => [0, 0], [])} />
      </div>
    );
  })
)`
  display: flex;
  flex-grow: 1;
  position: relative;
`;

function useAutoUpdatingClientRect() {
  const [rect, setRect] = useState<DOMRect>();
  const nodeRef = useRef<Element>();

  const ref = useCallback((node: Element | null) => {
    nodeRef.current = node === null ? undefined : node;
    if (node !== null) {
      setRect(node.getBoundingClientRect());
    }
  }, []);

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
  return [rect, ref] as const;
}

const DiagnosticDot = styled(
  React.memo(({ className, worldPosition }: { className?: string; worldPosition: Vector2 }) => {
    const worldToRaster = useSelector(selectors.worldToRaster);
    const [left, top] = worldToRaster(worldPosition);
    const style = {
      left: (left - 30).toString() + 'px',
      top: (top - 30).toString() + 'px',
    };
    return (
      <span role="img" aria-label="drooling face" className={className} style={style}>
        🤤
      </span>
    );
  })
)`
  position: absolute;
  width: 60px;
  height: 60px;
  text-align: center;
  font-size: 60px;
  user-select: none;
`;
