/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createStore as createReduxStore } from 'redux';
import { isPlainObject } from 'lodash';
import { middleware } from './middleware';
import { getRootReducer } from './reducers';

let store;

export function getStore() {
  return store;
}

export function cloneStore() {
  const state = store.getState();
  store = undefined;
  return createStore(state);
}

export function createStore(initialState) {
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

export function destroyStore() {
  if (store) {
    // Replace reducer so that anything that gets fired after navigating away doesn't really do anything
    store.replaceReducer((state) => state);
  }
  store = undefined;
}

export function getState() {
  return store.getState();
}
