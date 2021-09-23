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
import { LicensePage } from './pages/license_page';
import { ClusterOverview } from './pages/cluster/overview_page';
import { MonitoringStartPluginDependencies } from '../types';
import { GlobalStateProvider } from './global_state_context';
import { ExternalConfigContext, ExternalConfig } from './external_config_context';
import { createPreserveQueryHistory } from './preserve_query_history';
import { RouteInit } from './route_init';
import { NoDataPage } from './pages/no_data';
import { ElasticsearchOverviewPage } from './pages/elasticsearch/overview';
import { ElasticsearchNodesPage } from './pages/elasticsearch/nodes_page';
import { CODE_PATH_ELASTICSEARCH } from '../../common/constants';
import { MonitoringTimeContainer } from './hooks/use_monitoring_time';
import { BreadcrumbContainer } from './hooks/use_breadcrumbs';

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
            <BreadcrumbContainer.Provider history={history}>
              <Router history={history}>
                <Switch>
                  <Route path="/no-data" component={NoDataPage} />
                  <Route path="/loading" component={LoadingPage} />
                  <RouteInit
                    path="/license"
                    component={LicensePage}
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

                  {/* ElasticSearch Views */}
                  <RouteInit
                    path="/elasticsearch/nodes"
                    component={ElasticsearchNodesPage}
                    codePaths={[CODE_PATH_ELASTICSEARCH]}
                    fetchAllClusters={false}
                  />

                  <RouteInit
                    path="/elasticsearch"
                    component={ElasticsearchOverviewPage}
                    codePaths={[CODE_PATH_ELASTICSEARCH]}
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
            </BreadcrumbContainer.Provider>
          </MonitoringTimeContainer.Provider>
        </GlobalStateProvider>
      </ExternalConfigContext.Provider>
    </KibanaContextProvider>
  );
};

const Home: React.FC<{}> = () => {
  return <div>Home page (Cluster listing)</div>;
};
