/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart } from '@kbn/core/public';
import { ManagementAppMountParams } from '@kbn/management-plugin/public';
import React from 'react';
import ReactDOM from 'react-dom';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { Route, Router, Routes } from '@kbn/shared-ux-router';
import { KbnUrlStateStorageFromRouterProvider } from './utils/kbn_url_state_context';
import { useKibanaContextForPluginProvider } from './utils/use_kibana';
import { AppPluginStartDependencies, DataQualityPluginStart } from './types';
import { DatasetQualityRoute } from './routes';

export const renderApp = (
  core: CoreStart,
  plugins: AppPluginStartDependencies,
  pluginStart: DataQualityPluginStart,
  params: ManagementAppMountParams
) => {
  ReactDOM.render(
    <App params={params} core={core} plugins={plugins} pluginStart={pluginStart} />,
    params.element
  );

  return () => {
    ReactDOM.unmountComponentAtNode(params.element);
  };
};

interface AppProps {
  core: CoreStart;
  plugins: AppPluginStartDependencies;
  pluginStart: DataQualityPluginStart;
  params: ManagementAppMountParams;
}

const App = ({ core, plugins, pluginStart, params }: AppProps) => {
  const KibanaContextProviderForPlugin = useKibanaContextForPluginProvider(
    core,
    plugins,
    pluginStart,
    params
  );

  return (
    <KibanaRenderContextProvider {...core} {...params}>
      <KibanaContextProviderForPlugin>
        <KbnUrlStateStorageFromRouterProvider>
          <Router history={params.history}>
            <Routes>
              <Route path="/" exact={true} render={() => <DatasetQualityRoute />} />
            </Routes>
          </Router>
        </KbnUrlStateStorageFromRouterProvider>
      </KibanaContextProviderForPlugin>
    </KibanaRenderContextProvider>
  );
};
