/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart } from '@kbn/core/public';
import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { Route, Router, Routes } from '@kbn/shared-ux-router';
import React from 'react';
import ReactDOM from 'react-dom';
import { ObservabilityLogsExplorerMainRoute } from '../routes/main';
import { NotFoundPage } from '../routes/not_found';
import {
  ObservabilityLogsExplorerAppMountParameters,
  ObservabilityLogsExplorerPluginStart,
  ObservabilityLogsExplorerStartDeps,
} from '../types';
import { KbnUrlStateStorageFromRouterProvider } from '../utils/kbn_url_state_context';
import { useKibanaContextForPluginProvider } from '../utils/use_kibana';

export const renderObservabilityLogsExplorer = (
  core: CoreStart,
  pluginsStart: ObservabilityLogsExplorerStartDeps,
  ownPluginStart: ObservabilityLogsExplorerPluginStart,
  appParams: ObservabilityLogsExplorerAppMountParameters
) => {
  ReactDOM.render(
    <ObservabilityLogsExplorerApp
      appParams={appParams}
      core={core}
      plugins={pluginsStart}
      pluginStart={ownPluginStart}
    />,
    appParams.element
  );

  return () => {
    // work around race condition between unmount effect and current app id
    // observable in the search session service
    pluginsStart.data.search.session.clear();

    ReactDOM.unmountComponentAtNode(appParams.element);
  };
};

export interface ObservabilityLogsExplorerAppProps {
  appParams: ObservabilityLogsExplorerAppMountParameters;
  core: CoreStart;
  plugins: ObservabilityLogsExplorerStartDeps;
  pluginStart: ObservabilityLogsExplorerPluginStart;
}

export const ObservabilityLogsExplorerApp = ({
  appParams,
  core,
  plugins,
  pluginStart,
}: ObservabilityLogsExplorerAppProps) => {
  const isDarkMode = core.theme.getTheme().darkMode;
  const KibanaContextProviderForPlugin = useKibanaContextForPluginProvider(
    core,
    plugins,
    pluginStart,
    appParams
  );

  return (
    <KibanaRenderContextProvider i18n={core.i18n} theme={core.theme}>
      <KibanaContextProviderForPlugin>
        <KbnUrlStateStorageFromRouterProvider>
          <Router history={appParams.history}>
            <EuiThemeProvider darkMode={isDarkMode}>
              <Routes>
                <Route
                  path="/"
                  exact={true}
                  render={() => <ObservabilityLogsExplorerMainRoute />}
                />
                <Route render={() => <NotFoundPage />} />
              </Routes>
            </EuiThemeProvider>
          </Router>
        </KbnUrlStateStorageFromRouterProvider>
      </KibanaContextProviderForPlugin>
    </KibanaRenderContextProvider>
  );
};
