/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';
import ReactDOM from 'react-dom';
import { AppMountContext, AppMountParameters } from 'kibana/public';

/**
 * This module will be loaded asynchronously to reduce the bundle size of your plugin's main bundle.
 */
export function renderApp(appMountContext: AppMountContext, { element }: AppMountParameters) {
  appMountContext.core.http.get('/endpoint/hello-world');

  ReactDOM.render(<AppRoot />, element);

  return function() {
    ReactDOM.unmountComponentAtNode(element);
  };
}

const AppRoot = React.memo(function Root() {
  return <h1>Welcome to Endpoint</h1>;
});
