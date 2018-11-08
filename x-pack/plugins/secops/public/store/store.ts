/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AnyAction, applyMiddleware, compose, createStore as createReduxStore, Store } from 'redux';
import thunk from 'redux-thunk';

import { initialState, reducer, State } from '.';

declare global {
  interface Window {
    __REDUX_DEVTOOLS_EXTENSION_COMPOSE__: typeof compose;
  }
}

export const createStore = (): Store<State, AnyAction> => {
  const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;

  return createReduxStore(reducer, initialState, composeEnhancers(applyMiddleware(thunk)));
};
