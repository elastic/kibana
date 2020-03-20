/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  createStore,
  compose,
  applyMiddleware,
  Store,
  MiddlewareAPI,
  Dispatch,
  Middleware,
} from 'redux';
import { CoreStart } from 'kibana/public';
import { appReducer } from './reducer';
import { alertMiddlewareFactory } from './alerts/middleware';
import { hostMiddlewareFactory } from './hosts';
import { policyListMiddlewareFactory } from './policy_list';
import { policyDetailsMiddlewareFactory } from './policy_details';
import { GlobalState } from '../types';
import { AppAction } from './action';
import { EndpointPluginStartDependencies } from '../../../plugin';

const composeWithReduxDevTools = (window as any).__REDUX_DEVTOOLS_EXTENSION_COMPOSE__
  ? (window as any).__REDUX_DEVTOOLS_EXTENSION_COMPOSE__({ name: 'EndpointApp' })
  : compose;

export type Selector<S, R> = (state: S) => R;

/**
 * Wrap Redux Middleware and adjust 'getState()' to return the namespace from 'GlobalState that applies to the given Middleware concern.
 *
 * @param selector
 * @param middleware
 */
export const substateMiddlewareFactory = <Substate>(
  selector: Selector<GlobalState, Substate>,
  middleware: Middleware<{}, Substate, Dispatch<AppAction>>
): Middleware<{}, GlobalState, Dispatch<AppAction>> => {
  return api => {
    const substateAPI: MiddlewareAPI<Dispatch<AppAction>, Substate> = {
      ...api,
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
}) => Store = middlewareDeps => {
  let middleware;
  if (middlewareDeps) {
    const { coreStart, depsStart } = middlewareDeps;
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
        )
      )
    );
  } else {
    // Create the store without any middleware. This is useful for testing the store w/o side effects.
    middleware = undefined;
  }
  const store = createStore(appReducer, middleware);

  return store;
};
