/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Store } from 'redux';
import { createStore as createReduxStore, applyMiddleware } from 'redux';

import { Provider as ReduxProvider } from 'react-redux';
import createSagaMiddleware from 'redux-saga';

import { AppState } from '../../state';
import { rootReducer } from '../../state/reducers';
import { rootEffect } from '../../state/effects';

const createRealStore = (): Store => {
  const sagaMW = createSagaMiddleware();
  const store = createReduxStore(rootReducer, applyMiddleware(sagaMW));
  sagaMW.run(rootEffect);
  return store;
};

export const MountWithReduxProvider: React.FC<{ state?: AppState; useRealStore?: boolean }> = ({
  children,
  state,
  useRealStore,
}) => {
  const store = useRealStore
    ? createRealStore()
    : {
        dispatch: jest.fn(),
        getState: jest.fn().mockReturnValue(state || { selectedFilters: null }),
        subscribe: jest.fn(),
        replaceReducer: jest.fn(),
        [Symbol.observable]: jest.fn(),
      };

  return <ReduxProvider store={store}>{children}</ReduxProvider>;
};
