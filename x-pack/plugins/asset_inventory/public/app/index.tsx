/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import ReactDOM from 'react-dom';
import { Route, Router, Switch } from 'react-router-dom';
import { Storage } from '@kbn/kibana-utils-plugin/public';

import { AppMountParameters, APP_WRAPPER_CLASS, CoreStart } from '@kbn/core/public';
import { KibanaContextProvider, KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';

import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import { AssetInventoryPublicPluginsStart } from '../plugin';
import { routes } from './routes';

function App() {
  return (
    <>
      <Switch>
        {routes.map((routeProps) => {
          return <Route key={String(routeProps.path)} {...routeProps} />;
        })}
      </Switch>
    </>
  );
}

export function renderApp({
  core,
  config,
  plugins,
  appMountParameters,
  usageCollection,
  isDev,
}: {
  core: CoreStart;
  config: {};
  plugins: AssetInventoryPublicPluginsStart;
  appMountParameters: AppMountParameters;
  usageCollection: UsageCollectionSetup;
  isDev?: boolean;
}) {
  const { element, history, theme$ } = appMountParameters;
  const i18nCore = core.i18n;
  const isDarkMode = core.uiSettings.get('theme:darkMode');

  core.chrome.setHelpExtension({
    appName: i18n.translate('xpack.observability.feedbackMenu.appName', {
      defaultMessage: 'Observability',
    }),
    links: [{ linkType: 'discuss', href: 'https://ela.st/observability-discuss' }],
  });

  // ensure all divs are .kbnAppWrappers
  element.classList.add(APP_WRAPPER_CLASS);

  const ApplicationUsageTrackingProvider =
    usageCollection?.components.ApplicationUsageTrackingProvider ?? React.Fragment;

  ReactDOM.render(
    <ApplicationUsageTrackingProvider>
      <KibanaThemeProvider theme$={theme$}>
        <KibanaContextProvider
          services={{ ...core, ...plugins, storage: new Storage(localStorage), isDev }}
        >
          <Router history={history}>
            <EuiThemeProvider darkMode={isDarkMode}>
              <i18nCore.Context>
                <App />
              </i18nCore.Context>
            </EuiThemeProvider>
          </Router>
        </KibanaContextProvider>
      </KibanaThemeProvider>
    </ApplicationUsageTrackingProvider>,
    element
  );
  return () => {
    ReactDOM.unmountComponentAtNode(element);
  };
}
