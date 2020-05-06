/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';
import ReactDOM from 'react-dom';
import { CoreStart, AppMountParameters } from 'kibana/public';
import { createStore } from 'redux';
import { EndpointPluginStartDependencies } from '../../plugin';
import { appStoreEnhancerFactory } from './store';
import { AppRoot } from './view/app_root';
import {
  EndpointAppSubplugins,
  EndpointAppSubpluginMiddlewares,
  EndpointAppSubpluginReducers,
} from './types';
import { policyListMiddlewareFactory, policyListReducer } from './store/policy_list';
import { hostMiddlewareFactory, hostListReducer } from './store/hosts';
import { policyDetailsMiddlewareFactory, policyDetailsReducer } from './store/policy_details';
import { appReducerFactory } from './store/reducer';

/**
 * This module will be loaded asynchronously to reduce the bundle size of your plugin's main bundle.
 */
export function renderApp(
  coreStart: CoreStart,
  depsStart: EndpointPluginStartDependencies,
  { element, history }: AppMountParameters,
  subplugins: EndpointAppSubplugins
) {
  // TODO: Rethink this
  const subpluginMiddlewares: EndpointAppSubpluginMiddlewares = {
    alerting: subplugins.alerting.middleware,
    hostList: hostMiddlewareFactory(coreStart, depsStart),
    policyList: policyListMiddlewareFactory(coreStart, depsStart),
    policyDetails: policyDetailsMiddlewareFactory(coreStart, depsStart),
  };
  const subpluginReducers: EndpointAppSubpluginReducers = {
    alerting: subplugins.alerting.reducer,
    hostList: hostListReducer,
    policyList: policyListReducer,
    policyDetails: policyDetailsReducer,
  };

  const middleware = appStoreEnhancerFactory(subpluginMiddlewares);
  const reducer = appReducerFactory(subpluginReducers);
  const store = createStore(reducer, middleware);
  ReactDOM.render(
    <AppRoot
      history={history}
      store={store}
      coreStart={coreStart}
      depsStart={depsStart}
      subplugins={subplugins}
    />,
    element
  );
  return () => {
    ReactDOM.unmountComponentAtNode(element);
  };
}
