/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { applyMiddleware } from 'redux';
import { composeWithDevTools } from 'redux-devtools-extension/developmentOnly';
import { StoreEnhancer } from 'redux';
import { SubstateMiddlewareFactory, EndpointAppSubpluginMiddlewares } from '../types';

const composeWithReduxDevTools = composeWithDevTools({ name: 'EndpointApp' });

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

export const appStoreEnhancerFactory: (
  subpluginMiddlewares: EndpointAppSubpluginMiddlewares
) => StoreEnhancer = subpluginMiddlewares => {
  return composeWithReduxDevTools(
    applyMiddleware(
      substateMiddlewareFactory(globalState => globalState.hostList, subpluginMiddlewares.hosts),
      substateMiddlewareFactory(
        globalState => globalState.policyList,
        subpluginMiddlewares.policyList
      ),
      substateMiddlewareFactory(
        globalState => globalState.policyDetails,
        subpluginMiddlewares.policyDetails
      ),
      substateMiddlewareFactory(globalState => globalState.alerting, subpluginMiddlewares.alerting),
      // Additional Middleware should go last
      ...(subpluginMiddlewares.spyMiddleware ? [subpluginMiddlewares.spyMiddleware] : [])
    )
  );
};
