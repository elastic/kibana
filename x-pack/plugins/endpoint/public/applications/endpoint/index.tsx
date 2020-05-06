/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';
import ReactDOM from 'react-dom';
import { CoreStart, AppMountParameters } from 'kibana/public';
import { EndpointPluginStartDependencies } from '../../plugin';
import { appStoreFactory } from './store';
import { AppRoot } from './view/app_root';

/**
 * This module will be loaded asynchronously to reduce the bundle size of your plugin's main bundle.
 */
export function renderApp(
  coreStart: CoreStart,
  depsStart: EndpointPluginStartDependencies,
  { element, history }: AppMountParameters
) {
  const store = appStoreFactory({ coreStart, depsStart });
  ReactDOM.render(
    <AppRoot history={history} store={store} coreStart={coreStart} depsStart={depsStart} />,
    element
  );
  return () => {
    ReactDOM.unmountComponentAtNode(element);
  };
}
