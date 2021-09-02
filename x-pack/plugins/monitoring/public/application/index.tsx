/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart, AppMountParameters } from 'kibana/public';
import React from 'react';
import ReactDOM from 'react-dom';
import { Route, Switch, Redirect, Router } from 'react-router-dom';
import { KibanaContextProvider } from '../../../../../src/plugins/kibana_react/public';
import { LoadingPage } from './pages/loading_page';
import { ClusterOverview } from './pages/cluster/overview_page';
import { MonitoringStartPluginDependencies } from '../types';
import { GlobalStateProvider } from './global_state_context';
import { ExternalConfigContext, ExternalConfig } from './external_config_context';
import { createPreserveQueryHistory } from './preserve_query_history';
import { RouteInit } from './route_init';
import { MonitoringTimeContainer } from './pages/use_monitoring_time';

export const renderApp = (
  core: CoreStart,
  plugins: MonitoringStartPluginDependencies,
  { element }: AppMountParameters,
  externalConfig: ExternalConfig
) => {
  ReactDOM.render(
    <MonitoringApp core={core} plugins={plugins} externalConfig={externalConfig} />,
    element
  );

  return () => {
    ReactDOM.unmountComponentAtNode(element);
  };
};

const MonitoringApp: React.FC<{
  core: CoreStart;
  plugins: MonitoringStartPluginDependencies;
  externalConfig: ExternalConfig;
}> = ({ core, plugins, externalConfig }) => {
  const history = createPreserveQueryHistory();

  return (
    <KibanaContextProvider services={{ ...core, ...plugins }}>
      <ExternalConfigContext.Provider value={externalConfig}>
        <GlobalStateProvider query={plugins.data.query} toasts={core.notifications.toasts}>
          <MonitoringTimeContainer.Provider>
            <Router history={history}>
              <Switch>
                <Route path="/no-data" component={NoData} />
                <Route path="/loading" component={LoadingPage} />
                <RouteInit
                  path="/license"
                  component={License}
                  codePaths={['all']}
                  fetchAllClusters={false}
                />
                <RouteInit
                  path="/home"
                  component={Home}
                  codePaths={['all']}
                  fetchAllClusters={false}
                />
                <RouteInit
                  path="/overview"
                  component={ClusterOverview}
                  codePaths={['all']}
                  fetchAllClusters={false}
                />
                <Redirect
                  to={{
                    pathname: '/loading',
                    search: history.location.search,
                  }}
                />
              </Switch>
            </Router>
          </MonitoringTimeContainer.Provider>
        </GlobalStateProvider>
      </ExternalConfigContext.Provider>
    </KibanaContextProvider>
  );
};

const NoData: React.FC<{}> = () => {
  return <div>No data page</div>;
};

const Home: React.FC<{}> = () => {
  return <div>Home page (Cluster listing)</div>;
};

const License: React.FC<{}> = () => {
  return <div>License page</div>;
};
