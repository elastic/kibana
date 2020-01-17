/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createStore, compose, applyMiddleware } from 'redux';
import { CoreStart } from 'kibana/public';
import { appSagaFactory } from './saga';
import { appReducer } from './reducer';

export { GlobalState } from './reducer';

const composeWithReduxDevTools = (window as any).__REDUX_DEVTOOLS_EXTENSION_COMPOSE__
  ? (window as any).__REDUX_DEVTOOLS_EXTENSION_COMPOSE__({ name: 'EndpointApp' })
  : compose;

export const appStoreFactory = (coreStart: CoreStart) => {
  const store = createStore(
    appReducer,
    composeWithReduxDevTools(applyMiddleware(appSagaFactory(coreStart)))
  );
  return store;
};
