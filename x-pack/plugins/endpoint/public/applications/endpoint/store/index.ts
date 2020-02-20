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
import { managementMiddlewareFactory } from './managing';
import { policyListMiddlewareFactory } from './policy_list';
import { GlobalState } from '../types';
import { AppAction } from './action';

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

export const appStoreFactory = (coreStart: CoreStart): Store => {
  const store = createStore(
    appReducer,
    composeWithReduxDevTools(
      applyMiddleware(
        substateMiddlewareFactory(
          globalState => globalState.managementList,
          managementMiddlewareFactory(coreStart)
        ),
        substateMiddlewareFactory(
          globalState => globalState.policyList,
          policyListMiddlewareFactory(coreStart)
        ),
        substateMiddlewareFactory(
          globalState => globalState.alertList,
          alertMiddlewareFactory(coreStart)
        )
      )
    )
  );

  return store;
};
