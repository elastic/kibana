/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { Router, Switch } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Route } from '@kbn/shared-ux-router';
import { CoreStart } from '@kbn/core/public';
import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';
import { KibanaContextProvider, KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { ManagementAppMountParams } from '@kbn/management-plugin/public';
import { AlertingPluginStart } from '../plugin';
import { routes } from '../routes';

const App = React.memo(() => {
  return (
    <>
      <Switch>
        {Object.keys(routes.maintenanceWindows).map((path) => {
          const { handler, exact } = routes.maintenanceWindows[path];
          const Wrapper = () => handler();
          return <Route key={path} path={path} exact={exact} component={Wrapper} />;
        })}
      </Switch>
    </>
  );
});
App.displayName = 'App';

export const renderApp = ({
  core,
  plugins,
  mountParams,
  kibanaVersion,
}: {
  core: CoreStart;
  plugins: AlertingPluginStart;
  mountParams: ManagementAppMountParams;
  kibanaVersion: string;
}) => {
  const { element, history, theme$ } = mountParams;
  const i18nCore = core.i18n;
  const isDarkMode = core.uiSettings.get('theme:darkMode');

  const queryClient = new QueryClient();

  ReactDOM.render(
    <KibanaThemeProvider theme$={theme$}>
      <KibanaContextProvider
        services={{
          ...core,
          ...plugins,
          storage: new Storage(localStorage),
          kibanaVersion,
        }}
      >
        <Router history={history}>
          <EuiThemeProvider darkMode={isDarkMode}>
            <i18nCore.Context>
              <QueryClientProvider client={queryClient}>
                <App />
              </QueryClientProvider>
            </i18nCore.Context>
          </EuiThemeProvider>
        </Router>
      </KibanaContextProvider>
    </KibanaThemeProvider>,
    element
  );
  return () => {
    ReactDOM.unmountComponentAtNode(element);
  };
};
