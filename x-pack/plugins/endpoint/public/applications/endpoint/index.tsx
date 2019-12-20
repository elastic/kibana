/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';
import ReactDOM from 'react-dom';
import { CoreStart, AppMountParameters } from 'kibana/public';
import { I18nProvider, FormattedMessage } from '@kbn/i18n/react';

/**
 * This module will be loaded asynchronously to reduce the bundle size of your plugin's main bundle.
 */
export function renderApp(coreStart: CoreStart, { element }: AppMountParameters) {
  coreStart.http.get('/api/endpoint/hello-world');

  ReactDOM.render(<AppRoot />, element);

  return () => {
    ReactDOM.unmountComponentAtNode(element);
  };
}

const AppRoot = React.memo(() => (
  <I18nProvider>
    <h1 data-test-subj="welcomeTitle">
      <FormattedMessage id="xpack.endpoint.welcomeTitle" defaultMessage="Hello World" />
    </h1>
  </I18nProvider>
));
