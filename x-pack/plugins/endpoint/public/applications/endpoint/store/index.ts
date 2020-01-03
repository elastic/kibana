/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createStore, StoreEnhancer } from 'redux';
import { endpointAppReducers } from './reducers';

export { GlobalState } from './reducers';

const composeWithReduxDevTools =
  (window as any).__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || ((enhancer?: StoreEnhancer) => enhancer);

export const appStoreFactory = () => {
  const store = createStore(endpointAppReducers, composeWithReduxDevTools());
  return store;
};
