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
import { useExecutionContext } from '@kbn/kibana-react-plugin/public';
import { PerformanceContextProvider } from '@kbn/ebt-tools';
import { useKibanaContextForPluginProvider } from './utils/use_kibana';
import { AppPluginStartDependencies, DataUsagePluginStart } from './types';
import { PLUGIN_ID } from '../common';

export const renderApp = (
  core: CoreStart,
  plugins: AppPluginStartDependencies,
  pluginStart: DataUsagePluginStart,
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

const AppWithExecutionContext = ({
  core,
  params,
}: {
  core: CoreStart;
  params: ManagementAppMountParams;
}) => {
  const { executionContext } = core;

  useExecutionContext(executionContext, {
    type: 'application',
    page: PLUGIN_ID,
  });

  return (
    <Router history={params.history}>
      <PerformanceContextProvider>
        <Routes>
          <Route path="/" exact={true} render={() => <div>Data Usage</div>} />
        </Routes>
      </PerformanceContextProvider>
    </Router>
  );
};

interface AppProps {
  core: CoreStart;
  plugins: AppPluginStartDependencies;
  pluginStart: DataUsagePluginStart;
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
        <AppWithExecutionContext core={core} params={params} />
      </KibanaContextProviderForPlugin>
    </KibanaRenderContextProvider>
  );
};
