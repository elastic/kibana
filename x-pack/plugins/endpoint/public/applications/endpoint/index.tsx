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
import { appReducerFactory } from './store/reducer';

/**
 * This module will be loaded asynchronously to reduce the bundle size of your plugin's main bundle.
 */
export function renderApp(
  coreStart: CoreStart,
  depsStart: EndpointPluginStartDependencies,
  appMountParams: AppMountParameters,
  subplugins: EndpointAppSubplugins
) {
  // TODO: Rethink this
  const subpluginMiddlewares: EndpointAppSubpluginMiddlewares = {
    alerting: subplugins.alerting.middleware,
    hosts: subplugins.hosts.middleware,
    policyList: subplugins.policyList.middleware,
    policyDetails: subplugins.policyDetails.middleware,
  };
  const subpluginReducers: EndpointAppSubpluginReducers = {
    alerting: subplugins.alerting.reducer,
    hosts: subplugins.hosts.reducer,
    policyList: subplugins.policyList.reducer,
    policyDetails: subplugins.policyDetails.reducer,
  };

  const middleware = appStoreEnhancerFactory(subpluginMiddlewares);
  const reducer = appReducerFactory(subpluginReducers);
  const store = createStore(reducer, middleware);
  ReactDOM.render(
    <AppRoot
      appMountParams={appMountParams}
      store={store}
      coreStart={coreStart}
      depsStart={depsStart}
      subplugins={subplugins}
    />,
    appMountParams.element
  );
  return () => {
    ReactDOM.unmountComponentAtNode(appMountParams.element);
  };
}
