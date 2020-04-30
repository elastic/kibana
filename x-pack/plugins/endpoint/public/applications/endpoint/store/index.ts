/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createStore, compose, applyMiddleware, Store } from 'redux';
import { CoreStart } from 'kibana/public';
import { appReducer } from './reducer';
import { alertMiddlewareFactory } from '../alerts/store/middleware';
import { hostMiddlewareFactory } from './hosts';
import { policyListMiddlewareFactory } from './policy_list';
import { policyDetailsMiddlewareFactory } from './policy_details';
import { ImmutableMiddlewareFactory, SubstateMiddlewareFactory } from '../types';
import { EndpointPluginStartDependencies } from '../../../plugin';

const composeWithReduxDevTools = (window as any).__REDUX_DEVTOOLS_EXTENSION_COMPOSE__
  ? (window as any).__REDUX_DEVTOOLS_EXTENSION_COMPOSE__({ name: 'EndpointApp' })
  : compose;

export const substateMiddlewareFactory: SubstateMiddlewareFactory = (selector, middleware) => {
  return api => {
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

/**
 * @param middlewareDeps Optionally create the store without any middleware. This is useful for testing the store w/o side effects.
 */
export const appStoreFactory: (middlewareDeps?: {
  /**
   * Allow middleware to communicate with Kibana core.
   */
  coreStart: CoreStart;
  /**
   * Give middleware access to plugin start dependencies.
   */
  depsStart: EndpointPluginStartDependencies;
  /**
   * Any additional Redux Middlewares
   * (should only be used for testing - example: to inject the action spy middleware)
   */
  additionalMiddleware?: Array<ReturnType<ImmutableMiddlewareFactory>>;
}) => Store = middlewareDeps => {
  let middleware;
  if (middlewareDeps) {
    const { coreStart, depsStart, additionalMiddleware = [] } = middlewareDeps;
    middleware = composeWithReduxDevTools(
      applyMiddleware(
        substateMiddlewareFactory(
          globalState => globalState.hostList,
          hostMiddlewareFactory(coreStart, depsStart)
        ),
        substateMiddlewareFactory(
          globalState => globalState.policyList,
          policyListMiddlewareFactory(coreStart, depsStart)
        ),
        substateMiddlewareFactory(
          globalState => globalState.policyDetails,
          policyDetailsMiddlewareFactory(coreStart, depsStart)
        ),
        substateMiddlewareFactory(
          globalState => globalState.alertList,
          alertMiddlewareFactory(coreStart, depsStart)
        ),
        // Additional Middleware should go last
        ...additionalMiddleware
      )
    );
  } else {
    // Create the store without any middleware. This is useful for testing the store w/o side effects.
    middleware = undefined;
  }
  const store = createStore(appReducer, middleware);

  return store;
};
