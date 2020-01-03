/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createStore, compose, applyMiddleware } from 'redux';
import { endpointAppReducers } from './reducers';
import { endpointAppSagas } from './sagas';

export { GlobalState } from './reducers';

const composeWithReduxDevTools = (window as any).__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;

export const appStoreFactory = () => {
  const store = createStore(
    endpointAppReducers,
    composeWithReduxDevTools(applyMiddleware(endpointAppSagas))
  );
  return store;
};
