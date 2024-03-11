/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { CoreStart, AppMountParameters } from '@kbn/core/public';
import { KibanaThemeProvider } from '@kbn/react-kibana-context-theme';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { I18nProvider } from '@kbn/i18n-react';
import { BrowserRouter as Router } from '@kbn/shared-ux-router';
import { AppPluginStartDependencies } from './types';
import { SearchPlaygroundApp } from './components/app';

export const renderApp = (
  core: CoreStart,
  services: AppPluginStartDependencies,
  { appBasePath, element }: AppMountParameters
) => {
  ReactDOM.render(
    <KibanaThemeProvider theme={core.theme}>
      <KibanaContextProvider services={{ ...core, ...services }}>
        <I18nProvider>
          <Router basename={appBasePath}>
            <SearchPlaygroundApp navigation={services.navigation} />
          </Router>
        </I18nProvider>
      </KibanaContextProvider>
    </KibanaThemeProvider>,
    element
  );

  return () => ReactDOM.unmountComponentAtNode(element);
};
