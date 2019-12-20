/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createStore, StoreEnhancer } from 'redux';
import { ResolverAction } from '../types';
import { HttpSetup } from '../../../../../../../src/core/public';
import { resolverReducer } from './reducer';

export const storeFactory = (_dependencies: { httpService: HttpSetup }) => {
  interface SomethingThatMightHaveReduxDevTools {
    __REDUX_DEVTOOLS_EXTENSION__?: (options?: {
      name?: string;
      actionsBlacklist: readonly string[];
    }) => StoreEnhancer;
  }
  const windowWhichMightHaveReduxDevTools = window as SomethingThatMightHaveReduxDevTools;
  // Make sure blacklisted action types are valid
  const actionsBlacklist: ReadonlyArray<ResolverAction['type']> = ['userMovedPointer'];
  const store = createStore(
    resolverReducer,
    windowWhichMightHaveReduxDevTools.__REDUX_DEVTOOLS_EXTENSION__ &&
      windowWhichMightHaveReduxDevTools.__REDUX_DEVTOOLS_EXTENSION__({
        name: 'Resolver',
        actionsBlacklist,
      })
  );
  return {
    store,
  };
};
