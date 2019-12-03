/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createStore, StoreEnhancer } from 'redux';
import { resolverReducer } from './reducer';
import { HttpServiceBase } from '../../../../../../../src/core/public';

export const storeFactory = ({ httpServiceBase }: { httpServiceBase: HttpServiceBase }) => {
  interface SomethingThatMightHaveReduxDevTools {
    __REDUX_DEVTOOLS_EXTENSION__?: (options?: { name?: string }) => StoreEnhancer;
  }
  const windowWhichMightHaveReduxDevTools = window as SomethingThatMightHaveReduxDevTools;
  const store = createStore(
    resolverReducer,
    windowWhichMightHaveReduxDevTools.__REDUX_DEVTOOLS_EXTENSION__ &&
      windowWhichMightHaveReduxDevTools.__REDUX_DEVTOOLS_EXTENSION__({
        name: 'Resolver',
      })
  );
  return {
    store,
  };
};
