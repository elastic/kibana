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
import { i18n } from '@kbn/i18n';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { PLUGIN_ID } from '../common';
import { AppPluginStartDependencies } from './types';
import { App } from './components/app';
import { PlaygroundProvider } from './providers/playground_provider';

export const renderApp = (
  core: CoreStart,
  services: AppPluginStartDependencies,
  { appBasePath, element }: AppMountParameters
) => {
  const navigation = services.navigation;

  ReactDOM.render(
    <KibanaThemeProvider theme={core.theme}>
      <KibanaContextProvider services={{ ...core, ...services }}>
        <I18nProvider>
          <Router basename={appBasePath}>
            <navigation.ui.TopNavMenu appName={PLUGIN_ID} />
            <PlaygroundProvider>
              <KibanaPageTemplate
                pageChrome={[
                  i18n.translate('xpack.searchPlayground.breadcrumb', {
                    defaultMessage: 'Playground',
                  }),
                ]}
                pageHeader={{
                  pageTitle: i18n.translate('xpack.searchPlayground.pageTitle', {
                    defaultMessage: 'Playground',
                  }),
                }}
                bottomBorder="extended"
                restrictWidth={false}
              >
                <App />
              </KibanaPageTemplate>
            </PlaygroundProvider>
          </Router>
        </I18nProvider>
      </KibanaContextProvider>
    </KibanaThemeProvider>,
    element
  );

  return () => ReactDOM.unmountComponentAtNode(element);
};
