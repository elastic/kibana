/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createStore, StoreEnhancer } from 'redux';
import { ResolverAction } from '../types';
import { resolverReducer } from './reducer';

export const storeFactory = () => {
  /**
   * Redux Devtools extension exposes itself via a property on the global object.
   * This interface can be used to cast `window` to a type that may expose Redux Devtools.
   */
  interface SomethingThatMightHaveReduxDevTools {
    __REDUX_DEVTOOLS_EXTENSION__?: (options?: PartialReduxDevToolsOptions) => StoreEnhancer;
  }

  /**
   * Some of the options that can be passed when configuring Redux Devtools.
   */
  interface PartialReduxDevToolsOptions {
    /**
     * A name for this store
     */
    name?: string;
    /**
     * A list of action types to ignore. This is used to ignore high frequency events created by a mousemove handler
     */
    actionsBlacklist?: readonly string[];
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
