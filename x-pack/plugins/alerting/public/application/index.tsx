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
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Route } from '@kbn/shared-ux-router';
import { CoreStart } from '@kbn/core/public';
import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';
import { KibanaContextProvider, KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { ManagementAppMountParams } from '@kbn/management-plugin/public';
import { AlertingPluginStart, ConfigSchema } from '../plugin';
import { routes } from '../routes';
import { PluginContext } from '../context/plugin_context';

function App() {
  return (
    <>
      <Switch>
        {Object.keys(routes).map((key) => {
          const path = key as keyof typeof routes;
          const { handler, exact } = routes[path];
          const Wrapper = () => {
            return handler();
          };
          return <Route key={path} path={path} exact={exact} component={Wrapper} />;
        })}
      </Switch>
    </>
  );
}

export const renderApp = ({
  core,
  config,
  plugins,
  mountParams,
  kibanaVersion,
}: {
  core: CoreStart;
  config: ConfigSchema;
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
        <PluginContext.Provider value={{ config }}>
          <Router history={history}>
            <EuiThemeProvider darkMode={isDarkMode}>
              <i18nCore.Context>
                <QueryClientProvider client={queryClient}>
                  <App />
                  <ReactQueryDevtools />
                </QueryClientProvider>
              </i18nCore.Context>
            </EuiThemeProvider>
          </Router>
        </PluginContext.Provider>
      </KibanaContextProvider>
    </KibanaThemeProvider>,
    element
  );
  return () => {
    ReactDOM.unmountComponentAtNode(element);
  };
};
