/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createStore as createReduxStore, Store, AnyAction } from 'redux';
import { isPlainObject } from 'lodash';

import { State } from '../../types';

// @ts-expect-error Untyped local
import { middleware } from './middleware';
// @ts-expect-error Untyped local
import { getRootReducer } from './reducers';

let store: Store<State, AnyAction> | undefined;

export function getStore() {
  return store;
}

export function cloneStore() {
  if (!store) {
    throw new Error('Redux store has not been created yet.');
  }

  const state = store.getState();
  store = undefined;
  return createStore(state);
}

export function createStore(initialState: State) {
  if (typeof store !== 'undefined') {
    throw new Error('Redux store can only be initialized once');
  }

  if (!isPlainObject(initialState)) {
    throw new Error('Initial state must be a plain object');
  }

  const rootReducer = getRootReducer(initialState);
  store = createReduxStore(rootReducer, initialState, middleware);

  return store;
}

// This function is a big no-no.
// https://redux.js.org/faq/code-structure#how-can-i-use-the-redux-store-in-non-component-files
export function UNSAFE_getState() {
  if (!store) {
    throw new Error('Redux store has not been created yet.');
  }

  return store.getState();
}
