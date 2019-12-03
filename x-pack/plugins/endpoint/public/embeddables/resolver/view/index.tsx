/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { MouseEventHandler, useCallback, useState, useEffect, useRef } from 'react';
import { Store } from 'redux';
import { Provider, useSelector, useDispatch } from 'react-redux';
import { Dispatch } from 'redux';
import styled from 'styled-components';
import { ResolverState, ResolverAction } from '../types';
import * as selectors from '../store/selectors';

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
    const worldToRaster = useSelector(selectors.worldToRaster);

    console.log('we rerendered!', 'worldToRaster([0, 0])', worldToRaster([0, 0]));
    const scale = useSelector(selectors.scale);

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

    const handleMouseMove: MouseEventHandler<HTMLDivElement> = useCallback(
      event => {
        if (event.buttons === 1) {
          dispatch({
            type: 'userPanned',
            payload: [event.movementX * scale[0], event.movementY * scale[1]],
          });
        }
      },
      [scale, dispatch]
    );

    return (
      <div className={className} ref={clientRectCallbackFunction} onMouseMove={handleMouseMove} />
    );
  })
)`
  display: flex;
  flex-grow: 1;
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
