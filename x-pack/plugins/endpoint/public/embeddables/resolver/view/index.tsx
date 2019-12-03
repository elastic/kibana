/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { MouseEventHandler, useCallback, useState, useEffect } from 'react';
import { Store } from 'redux';
import { Provider, useSelector, useDispatch } from 'react-redux';
import { Dispatch } from 'redux';
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

const Diagnostic: React.FC<{}> = React.memo(() => {
  const worldToRaster = useSelector(selectors.worldToRaster);

  console.log('we rerendered!', 'worldToRaster([0, 0])', worldToRaster([0, 0]));
  const scale = useSelector(selectors.scale);

  const [elementBoundingClientRect, clientRectCallbackFunction] = useClientRect();

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

  return <div ref={clientRectCallbackFunction} onMouseMove={handleMouseMove} />;
});

function useClientRect() {
  const [rect, setRect] = useState<DOMRect>();
  const ref = useCallback((node: Element | null) => {
    if (node !== null) {
      setRect(node.getBoundingClientRect());
    }
  }, []);
  return [rect, ref] as const;
}
