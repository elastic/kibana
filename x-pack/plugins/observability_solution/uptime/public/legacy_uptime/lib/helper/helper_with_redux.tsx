/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, PropsWithChildren } from 'react';
import type { Store } from 'redux';
import { applyMiddleware, createStore as createReduxStore } from 'redux';

import { Provider as ReduxProvider } from 'react-redux';
import createSagaMiddleware from 'redux-saga';

import { AppState } from '../../state';
import { rootEffect } from '../../state/effects';
import { rootReducer } from '../../state/reducers';

export const createRealStore = (): Store => {
  const sagaMW = createSagaMiddleware();
  const store = createReduxStore(rootReducer, applyMiddleware(sagaMW));
  sagaMW.run(rootEffect);
  return store;
};

export const MountWithReduxProvider: FC<
  PropsWithChildren<{
    state?: AppState;
    useRealStore?: boolean;
    store?: Store;
  }>
> = ({ children, state, store, useRealStore }) => {
  const newStore = useRealStore
    ? createRealStore()
    : {
        dispatch: jest.fn(),
        getState: jest.fn().mockReturnValue(state || { selectedFilters: null }),
        subscribe: jest.fn(),
        replaceReducer: jest.fn(),
        [Symbol.observable]: jest.fn(),
      };

  return <ReduxProvider store={store ?? newStore}>{children}</ReduxProvider>;
};
