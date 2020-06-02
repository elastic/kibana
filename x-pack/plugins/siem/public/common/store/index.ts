/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export * from './model';
export * from './reducer';
export * from './selectors';

import { createStore, getStore } from './store';
import { SubstateMiddlewareFactory } from './types';

export { createStore, getStore };

export const substateMiddlewareFactory: SubstateMiddlewareFactory = (selector, middleware) => {
  return (api) => {
    const substateAPI = {
      ...api,
      // Return just the substate instead of global state.
      getState() {
        return selector(api.getState());
      },
    };
    return middleware(substateAPI);
  };
};
