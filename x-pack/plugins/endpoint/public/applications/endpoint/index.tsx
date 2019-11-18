/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';
import ReactDOM from 'react-dom';
import { AppMountContext, AppMountParameters } from 'kibana/public';
import { I18nProvider, FormattedMessage } from '@kbn/i18n/react';

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
  return (
    <I18nProvider>
      <h1>
        <FormattedMessage id="endpoint.welcome" defaultMessage="Hello World" />
      </h1>
    </I18nProvider>
  );
});
