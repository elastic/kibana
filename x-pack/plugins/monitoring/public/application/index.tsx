/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AppMountParameters, CoreStart, CoreTheme, MountPoint } from '@kbn/core/public';
import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';
import { KibanaContextProvider, KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import React, { useMemo } from 'react';
import ReactDOM from 'react-dom';
import { Navigate, Route, Router, Routes } from 'react-router-dom';
import useObservable from 'react-use/lib/useObservable';
import { Observable } from 'rxjs';
import {
  CODE_PATH_APM,
  CODE_PATH_BEATS,
  CODE_PATH_ELASTICSEARCH,
  CODE_PATH_ENTERPRISE_SEARCH,
  CODE_PATH_KIBANA,
  CODE_PATH_LOGSTASH,
} from '../../common/constants';
import { MonitoringStartPluginDependencies } from '../types';
import { ExternalConfig, ExternalConfigContext } from './contexts/external_config_context';
import { GlobalStateProvider } from './contexts/global_state_context';
import { HeaderActionMenuContext } from './contexts/header_action_menu_context';
import { BreadcrumbContainer } from './hooks/use_breadcrumbs';
import { MonitoringTimeContainer } from './hooks/use_monitoring_time';
import { AccessDeniedPage } from './pages/access_denied';
import { ApmInstancePage, ApmInstancesPage, ApmOverviewPage } from './pages/apm';
import { BeatsInstancePage } from './pages/beats/instance';
import { BeatsInstancesPage } from './pages/beats/instances';
import { BeatsOverviewPage } from './pages/beats/overview';
import { ClusterOverview } from './pages/cluster/overview_page';
import { ElasticsearchCcrPage } from './pages/elasticsearch/ccr_page';
import { ElasticsearchCcrShardPage } from './pages/elasticsearch/ccr_shard_page';
import { ElasticsearchIndexAdvancedPage } from './pages/elasticsearch/index_advanced_page';
import { ElasticsearchIndexPage } from './pages/elasticsearch/index_page';
import { ElasticsearchIndicesPage } from './pages/elasticsearch/indices_page';
import { ElasticsearchMLJobsPage } from './pages/elasticsearch/ml_jobs_page';
import { ElasticsearchNodesPage } from './pages/elasticsearch/nodes_page';
import { ElasticsearchNodeAdvancedPage } from './pages/elasticsearch/node_advanced_page';
import { ElasticsearchNodePage } from './pages/elasticsearch/node_page';
import { ElasticsearchOverviewPage } from './pages/elasticsearch/overview';
import { EntSearchOverviewPage } from './pages/enterprise_search/overview';
import { ClusterListing } from './pages/home/cluster_listing';
import { KibanaInstancePage } from './pages/kibana/instance';
import { KibanaInstancesPage } from './pages/kibana/instances';
import { KibanaOverviewPage } from './pages/kibana/overview';
import { LicensePage } from './pages/license_page';
import { LoadingPage } from './pages/loading_page';
import { LogStashNodeAdvancedPage } from './pages/logstash/advanced';
// import { LogStashNodePipelinesPage } from './pages/logstash/node_pipelines';
import { LogStashNodePage } from './pages/logstash/node';
import { LogStashNodesPage } from './pages/logstash/nodes';
import { LogStashNodePipelinesPage } from './pages/logstash/node_pipelines';
import { LogStashOverviewPage } from './pages/logstash/overview';
import { LogStashPipelinePage } from './pages/logstash/pipeline';
import { LogStashPipelinesPage } from './pages/logstash/pipelines';
import { NoDataPage } from './pages/no_data';
import { createPreserveQueryHistory } from './preserve_query_history';
import { RouteInit } from './route_init';

export const renderApp = (
  core: CoreStart,
  plugins: MonitoringStartPluginDependencies,
  { element, history, setHeaderActionMenu, theme$ }: AppMountParameters,
  externalConfig: ExternalConfig
) => {
  // dispatch synthetic hash change event to update hash history objects
  // this is necessary because hash updates triggered by using popState won't trigger this event naturally.
  const unlistenParentHistory = history.listen(() => {
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });

  ReactDOM.render(
    <MonitoringApp
      core={core}
      plugins={plugins}
      externalConfig={externalConfig}
      setHeaderActionMenu={setHeaderActionMenu}
      theme$={theme$}
    />,
    element
  );

  return () => {
    ReactDOM.unmountComponentAtNode(element);
    unlistenParentHistory();
  };
};

const MonitoringApp: React.FC<{
  core: CoreStart;
  plugins: MonitoringStartPluginDependencies;
  externalConfig: ExternalConfig;
  setHeaderActionMenu: (element: MountPoint<HTMLElement> | undefined) => void;
  theme$: Observable<CoreTheme>;
}> = ({ core, plugins, externalConfig, setHeaderActionMenu, theme$ }) => {
  const history = createPreserveQueryHistory();

  const darkModeObservable: Observable<boolean> = useMemo(
    () => core.uiSettings!.get$('theme:darkMode'),
    [core.uiSettings]
  );
  const darkMode = useObservable(darkModeObservable, core.uiSettings!.get('theme:darkMode'));

  return (
    <KibanaContextProvider services={{ ...core, ...plugins }}>
      <EuiThemeProvider darkMode={darkMode}>
        <KibanaThemeProvider theme$={core.theme.theme$}>
          <ExternalConfigContext.Provider value={externalConfig}>
            <GlobalStateProvider
              query={plugins.data.query}
              toasts={core.notifications.toasts}
              uiSettings={core.uiSettings}
            >
              <HeaderActionMenuContext.Provider value={{ setHeaderActionMenu, theme$ }}>
                <MonitoringTimeContainer>
                  <BreadcrumbContainer history={history}>
                    <Router
                      navigator={history}
                      location={history.location}
                      basename="app/monitorinfg"
                    >
                      <Routes>
                        <Route path="/access-denied/*" element={AccessDeniedPage} />
                        <Route path="/no-data/*" element={<NoDataPage />} />
                        <Route path="/loading" element={<LoadingPage />} />
                        <Route
                          path="license"
                          element={
                            <RouteInit
                              component={LicensePage}
                              codePaths={['all']}
                              fetchAllClusters={false}
                            />
                          }
                        />
                        <Route
                          path="home"
                          element={
                            <RouteInit
                              component={ClusterListing}
                              codePaths={['all']}
                              fetchAllClusters={true}
                              unsetGlobalState={true}
                            />
                          }
                        />
                        <Route
                          path="overview"
                          element={
                            <RouteInit
                              component={ClusterOverview}
                              codePaths={['all']}
                              fetchAllClusters={false}
                            />
                          }
                        />

                        {/* ElasticSearch Views */}
                        <Route
                          path="elasticsearch/ml_jobs"
                          element={
                            <RouteInit
                              component={ElasticsearchMLJobsPage}
                              codePaths={[CODE_PATH_ELASTICSEARCH]}
                              fetchAllClusters={false}
                            />
                          }
                        />

                        <Route
                          path="elasticsearch/ccr/:index/shard/:shardId"
                          element={
                            <RouteInit
                              component={ElasticsearchCcrShardPage}
                              codePaths={[CODE_PATH_ELASTICSEARCH]}
                              fetchAllClusters={false}
                            />
                          }
                        />

                        <Route
                          path="elasticsearch/ccr"
                          element={
                            <RouteInit
                              component={ElasticsearchCcrPage}
                              codePaths={[CODE_PATH_ELASTICSEARCH]}
                              fetchAllClusters={false}
                            />
                          }
                        />

                        <Route
                          path="elasticsearch/indices/:index/advanced"
                          element={
                            <RouteInit
                              component={ElasticsearchIndexAdvancedPage}
                              codePaths={[CODE_PATH_ELASTICSEARCH]}
                              fetchAllClusters={false}
                            />
                          }
                        />

                        <Route
                          path="elasticsearch/indices/:index"
                          element={
                            <RouteInit
                              component={ElasticsearchIndexPage}
                              codePaths={[CODE_PATH_ELASTICSEARCH]}
                              fetchAllClusters={false}
                            />
                          }
                        />

                        <Route
                          path="elasticsearch/indices"
                          element={
                            <RouteInit
                              component={ElasticsearchIndicesPage}
                              codePaths={[CODE_PATH_ELASTICSEARCH]}
                              fetchAllClusters={false}
                            />
                          }
                        />

                        <Route
                          path="elasticsearch/nodes/:node/advanced"
                          element={
                            <RouteInit
                              component={ElasticsearchNodeAdvancedPage}
                              codePaths={[CODE_PATH_ELASTICSEARCH]}
                              fetchAllClusters={false}
                            />
                          }
                        />

                        <Route
                          path="elasticsearch/nodes/:node"
                          element={
                            <RouteInit
                              component={ElasticsearchNodePage}
                              codePaths={[CODE_PATH_ELASTICSEARCH]}
                              fetchAllClusters={false}
                            />
                          }
                        />

                        <Route
                          path="elasticsearch/nodes"
                          element={
                            <RouteInit
                              component={ElasticsearchNodesPage}
                              codePaths={[CODE_PATH_ELASTICSEARCH]}
                              fetchAllClusters={false}
                            />
                          }
                        />

                        <Route
                          path="elasticsearch"
                          element={
                            <RouteInit
                              component={ElasticsearchOverviewPage}
                              codePaths={[CODE_PATH_ELASTICSEARCH]}
                              fetchAllClusters={false}
                            />
                          }
                        />

                        {/* Kibana Views */}
                        <Route
                          path="kibana/instances/:instance"
                          element={
                            <RouteInit
                              component={KibanaInstancePage}
                              codePaths={[CODE_PATH_KIBANA]}
                              fetchAllClusters={false}
                            />
                          }
                        />

                        <Route
                          path="kibana/instances"
                          element={
                            <RouteInit
                              component={KibanaInstancesPage}
                              codePaths={[CODE_PATH_KIBANA]}
                              fetchAllClusters={false}
                            />
                          }
                        />

                        <Route
                          path="kibana"
                          element={
                            <RouteInit
                              component={KibanaOverviewPage}
                              codePaths={[CODE_PATH_KIBANA]}
                              fetchAllClusters={false}
                            />
                          }
                        />

                        {/* Beats Views */}
                        <Route
                          path="beats/beat/:instance"
                          element={
                            <RouteInit
                              component={BeatsInstancePage}
                              codePaths={[CODE_PATH_BEATS]}
                              fetchAllClusters={false}
                            />
                          }
                        />

                        <Route
                          path="beats/beats"
                          element={
                            <RouteInit
                              component={BeatsInstancesPage}
                              codePaths={[CODE_PATH_BEATS]}
                              fetchAllClusters={false}
                            />
                          }
                        />

                        <Route
                          path="beats"
                          element={
                            <RouteInit
                              component={BeatsOverviewPage}
                              codePaths={[CODE_PATH_BEATS]}
                              fetchAllClusters={false}
                            />
                          }
                        />

                        {/* Logstash Routes */}
                        <Route
                          path="logstash/nodes"
                          element={
                            <RouteInit
                              component={LogStashNodesPage}
                              codePaths={[CODE_PATH_LOGSTASH]}
                              fetchAllClusters={false}
                            />
                          }
                        />

                        <Route
                          path="logstash/node/:uuid/advanced"
                          element={
                            <RouteInit
                              component={LogStashNodeAdvancedPage}
                              codePaths={[CODE_PATH_LOGSTASH]}
                              fetchAllClusters={false}
                            />
                          }
                        />

                        <Route
                          path="logstash/node/:uuid/pipelines"
                          element={
                            <RouteInit
                              component={LogStashNodePipelinesPage}
                              codePaths={[CODE_PATH_LOGSTASH]}
                              fetchAllClusters={false}
                            />
                          }
                        />

                        <Route
                          path="logstash/node/:uuid"
                          element={
                            <RouteInit
                              component={LogStashNodePage}
                              codePaths={[CODE_PATH_LOGSTASH]}
                              fetchAllClusters={false}
                            />
                          }
                        />

                        <Route
                          path="logstash/pipelines/:id/:hash?"
                          element={
                            <RouteInit
                              component={LogStashPipelinePage}
                              codePaths={[CODE_PATH_LOGSTASH]}
                              fetchAllClusters={false}
                            />
                          }
                        />

                        <Route
                          path="logstash/pipelines"
                          element={
                            <RouteInit
                              component={LogStashPipelinesPage}
                              codePaths={[CODE_PATH_LOGSTASH]}
                              fetchAllClusters={false}
                            />
                          }
                        />

                        <Route
                          path="logstash"
                          element={
                            <RouteInit
                              component={LogStashOverviewPage}
                              codePaths={[CODE_PATH_LOGSTASH]}
                              fetchAllClusters={false}
                            />
                          }
                        />

                        {/* APM Views */}
                        <Route
                          path="apm/instances/:instance"
                          element={
                            <RouteInit
                              component={ApmInstancePage}
                              codePaths={[CODE_PATH_APM]}
                              fetchAllClusters={false}
                            />
                          }
                        />

                        <Route
                          path="apm/instances"
                          element={
                            <RouteInit
                              component={ApmInstancesPage}
                              codePaths={[CODE_PATH_APM]}
                              fetchAllClusters={false}
                            />
                          }
                        />

                        <Route
                          path="apm"
                          element={
                            <RouteInit
                              component={ApmOverviewPage}
                              codePaths={[CODE_PATH_APM]}
                              fetchAllClusters={false}
                            />
                          }
                        />

                        <Route
                          path="enterprise_search"
                          element={
                            <RouteInit
                              component={EntSearchOverviewPage}
                              codePaths={[CODE_PATH_ENTERPRISE_SEARCH]}
                              fetchAllClusters={false}
                            />
                          }
                        />

                        <Route
                          element={
                            <Navigate
                              to={{
                                pathname: 'loading',
                                search: history.location.search,
                              }}
                            />
                          }
                        />
                      </Routes>
                    </Router>
                  </BreadcrumbContainer>
                </MonitoringTimeContainer>
              </HeaderActionMenuContext.Provider>
            </GlobalStateProvider>
          </ExternalConfigContext.Provider>
        </KibanaThemeProvider>
      </EuiThemeProvider>
    </KibanaContextProvider>
  );
};
