/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiErrorBoundary } from '@elastic/eui';
import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter as Router } from 'react-router-dom';
import { I18nProvider } from '@kbn/i18n/react';

import { AppMountParameters, CoreStart } from '../../../../src/core/public';
import { AppPluginStartDependencies } from './types';
import { OsqueryApp } from './components/app';
import { PLUGIN_NAME } from '../common';
import { KibanaContextProvider } from './common/lib/kibana';

export const renderApp = (
  { notifications, http }: CoreStart,
  services: AppPluginStartDependencies,
  { appBasePath, element }: AppMountParameters
) => {
  ReactDOM.render(
    <KibanaContextProvider services={{ appName: PLUGIN_NAME, notifications, http, ...services }}>
      <EuiErrorBoundary>
        <Router basename={appBasePath}>
          <I18nProvider>
            <OsqueryApp />
          </I18nProvider>
        </Router>
      </EuiErrorBoundary>
    </KibanaContextProvider>,
    element
  );

  return () => ReactDOM.unmountComponentAtNode(element);
};
