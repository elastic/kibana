/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable no-console */

/*
  This Provider is temporary.  See https://github.com/elastic/kibana/pull/69357
*/

import React, { FC } from 'react';
import { applyMiddleware, createStore, Dispatch, Store } from 'redux';
import thunkMiddleware from 'redux-thunk';
import { Provider as ReduxProvider } from 'react-redux';

// @ts-expect-error untyped local
import { appReady } from '../../../../public/state/middleware/app_ready';
// @ts-expect-error untyped local
import { resolvedArgs } from '../../../../public/state/middleware/resolved_args';

// @ts-expect-error untyped local
import { getRootReducer } from '../../../../public/state/reducers';

// @ts-expect-error Untyped local
import { getDefaultWorkpad } from '../../../../public/state/defaults';
import { State, AssetType } from '../../../../types';

export const AIRPLANE: AssetType = {
  '@created': '2018-10-13T16:44:44.648Z',
  id: 'airplane',
  type: 'dataurl',
  value:
    'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1Ni4zMSA1Ni4zMSI+PGRlZnM+PHN0eWxlPi5jbHMtMXtmaWxsOiNmZmY7c3Ryb2tlOiMwMDc4YTA7c3Ryb2tlLW1pdGVybGltaXQ6MTA7c3Ryb2tlLXdpZHRoOjJweDt9PC9zdHlsZT48L2RlZnM+PHRpdGxlPlBsYW5lIEljb248L3RpdGxlPjxnIGlkPSJMYXllcl8yIiBkYXRhLW5hbWU9IkxheWVyIDIiPjxnIGlkPSJMYXllcl8xLTIiIGRhdGEtbmFtZT0iTGF5ZXIgMSI+PHBhdGggY2xhc3M9ImNscy0xIiBkPSJNNDkuNTEsNDguOTMsNDEuMjYsMjIuNTIsNTMuNzYsMTBhNS4yOSw1LjI5LDAsMCwwLTcuNDgtNy40N2wtMTIuNSwxMi41TDcuMzgsNi43OUEuNy43LDAsMCwwLDYuNjksN0wxLjIsMTIuNDVhLjcuNywwLDAsMCwwLDFMMTkuODUsMjlsLTcuMjQsNy4yNC03Ljc0LS42YS43MS43MSwwLDAsMC0uNTMuMkwxLjIxLDM5YS42Ny42NywwLDAsMCwuMDgsMUw5LjQ1LDQ2bC4wNywwYy4xMS4xMy4yMi4yNi4zNC4zOHMuMjUuMjMuMzguMzRhLjM2LjM2LDAsMCwwLDAsLjA3TDE2LjMzLDU1YS42OC42OCwwLDAsMCwxLC4wN0wyMC40OSw1MmEuNjcuNjcsMCwwLDAsLjE5LS41NGwtLjU5LTcuNzQsNy4yNC03LjI0TDQyLjg1LDU1LjA2YS42OC42OCwwLDAsMCwxLDBsNS41LTUuNUEuNjYuNjYsMCwwLDAsNDkuNTEsNDguOTNaIi8+PC9nPjwvZz48L3N2Zz4=',
};

export const MARKER: AssetType = {
  '@created': '2018-10-13T16:44:44.648Z',
  id: 'marker',
  type: 'dataurl',
  value:
    'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzOC4zOSA1Ny41NyI+PGRlZnM+PHN0eWxlPi5jbHMtMXtmaWxsOiNmZmY7c3Ryb2tlOiMwMTliOGY7c3Ryb2tlLW1pdGVybGltaXQ6MTA7c3Ryb2tlLXdpZHRoOjJweDt9PC9zdHlsZT48L2RlZnM+PHRpdGxlPkxvY2F0aW9uIEljb248L3RpdGxlPjxnIGlkPSJMYXllcl8yIiBkYXRhLW5hbWU9IkxheWVyIDIiPjxnIGlkPSJMYXllcl8xLTIiIGRhdGEtbmFtZT0iTGF5ZXIgMSI+PHBhdGggY2xhc3M9ImNscy0xIiBkPSJNMTkuMTksMUExOC4xOSwxOC4xOSwwLDAsMCwyLjk0LDI3LjM2aDBhMTkuNTEsMTkuNTEsMCwwLDAsMSwxLjc4TDE5LjE5LDU1LjU3LDM0LjM4LDI5LjIxQTE4LjE5LDE4LjE5LDAsMCwwLDE5LjE5LDFabTAsMjMuMjlhNS41Myw1LjUzLDAsMSwxLDUuNTMtNS41M0E1LjUzLDUuNTMsMCwwLDEsMTkuMTksMjQuMjlaIi8+PC9nPjwvZz48L3N2Zz4=',
};

export const state: State = {
  app: {
    basePath: '/',
    ready: true,
    serverFunctions: [],
  },
  assets: {
    AIRPLANE,
    MARKER,
  },
  transient: {
    canUserWrite: true,
    zoomScale: 1,
    elementStats: {
      total: 0,
      ready: 0,
      pending: 0,
      error: 0,
    },
    inFlight: false,
    fullScreen: false,
    selectedTopLevelNodes: [],
    resolvedArgs: {},
    refresh: {
      interval: 0,
    },
    autoplay: {
      enabled: false,
      interval: 10000,
    },
  },
  persistent: {
    schemaVersion: 2,
    workpad: getDefaultWorkpad(),
  },
};

// @ts-expect-error untyped local
import { elementsRegistry } from '../../../lib/elements_registry';
import { image } from '../../../../canvas_plugin_src/elements/image';
elementsRegistry.register(image);

export const patchDispatch: (store: Store, dispatch: Dispatch) => Dispatch = (store, dispatch) => (
  action
) => {
  const previousState = store.getState();
  const returnValue = dispatch(action);
  const newState = store.getState();

  console.group(action.type || '(thunk)');
  console.log('Previous State', previousState);
  console.log('New State', newState);
  console.groupEnd();

  return returnValue;
};

export const Provider: FC = ({ children }) => {
  const middleware = applyMiddleware(thunkMiddleware);
  const reducer = getRootReducer(state);
  const store = createStore(reducer, state, middleware);
  store.dispatch = patchDispatch(store, store.dispatch);

  return <ReduxProvider store={store}>{children}</ReduxProvider>;
};
