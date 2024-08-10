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
import { NotFoundPage } from '../routes/not_found';
import { RecommendationsRoute } from '../routes/recommendations';
import {
  LogsOptimizationAppMountParameters,
  LogsOptimizationPublicStart,
  LogsOptimizationPublicStartDeps,
} from '../types';
import { KbnUrlStateStorageFromRouterProvider } from '../utils/kbn_url_state_context';
import { useKibanaContextForPluginProvider } from '../utils/use_kibana';

export const renderRecommendationsApp = (
  core: CoreStart,
  pluginsStart: LogsOptimizationPublicStartDeps,
  ownPluginStart: LogsOptimizationPublicStart,
  appParams: LogsOptimizationAppMountParameters
) => {
  ReactDOM.render(
    <RecommendationsApp
      appParams={appParams}
      core={core}
      plugins={pluginsStart}
      pluginStart={ownPluginStart}
    />,
    appParams.element
  );

  return () => {
    ReactDOM.unmountComponentAtNode(appParams.element);
  };
};

export interface RecommendationsAppProps {
  appParams: LogsOptimizationAppMountParameters;
  core: CoreStart;
  plugins: LogsOptimizationPublicStartDeps;
  pluginStart: LogsOptimizationPublicStart;
}

export const RecommendationsApp = ({
  appParams,
  core,
  plugins,
  pluginStart,
}: RecommendationsAppProps) => {
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
                <Route path="/:dataStream" exact={true} render={() => <RecommendationsRoute />} />
                <Route render={() => <NotFoundPage />} />
              </Routes>
            </EuiThemeProvider>
          </Router>
        </KbnUrlStateStorageFromRouterProvider>
      </KibanaContextProviderForPlugin>
    </KibanaRenderContextProvider>
  );
};
