/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart, AppMountParameters, MountPoint, CoreTheme } from 'kibana/public';
import React from 'react';
import ReactDOM from 'react-dom';
import { Route, Switch, Redirect, Router } from 'react-router-dom';
import { Observable } from 'rxjs';
import { KibanaContextProvider } from '../../../../../src/plugins/kibana_react/public';
import { LoadingPage } from './pages/loading_page';
import { LicensePage } from './pages/license_page';
import { ClusterOverview } from './pages/cluster/overview_page';
import { ClusterListing } from './pages/home/cluster_listing';
import { MonitoringStartPluginDependencies } from '../types';
import { GlobalStateProvider } from './contexts/global_state_context';
import { ExternalConfigContext, ExternalConfig } from './contexts/external_config_context';
import { createPreserveQueryHistory } from './preserve_query_history';
import { RouteInit } from './route_init';
import { NoDataPage } from './pages/no_data';
import { ElasticsearchOverviewPage } from './pages/elasticsearch/overview';
import { BeatsOverviewPage } from './pages/beats/overview';
import {
  CODE_PATH_ELASTICSEARCH,
  CODE_PATH_BEATS,
  CODE_PATH_KIBANA,
  CODE_PATH_LOGSTASH,
  CODE_PATH_APM,
  CODE_PATH_ENTERPRISE_SEARCH,
} from '../../common/constants';
import { BeatsInstancePage } from './pages/beats/instance';
import { ApmOverviewPage, ApmInstancesPage, ApmInstancePage } from './pages/apm';
import { KibanaOverviewPage } from './pages/kibana/overview';
import { KibanaInstancesPage } from './pages/kibana/instances';
import { KibanaInstancePage } from './pages/kibana/instance';
import { ElasticsearchNodesPage } from './pages/elasticsearch/nodes_page';
import { ElasticsearchIndicesPage } from './pages/elasticsearch/indices_page';
import { ElasticsearchIndexPage } from './pages/elasticsearch/index_page';
import { ElasticsearchIndexAdvancedPage } from './pages/elasticsearch/index_advanced_page';
import { ElasticsearchNodePage } from './pages/elasticsearch/node_page';
import { ElasticsearchMLJobsPage } from './pages/elasticsearch/ml_jobs_page';
import { ElasticsearchNodeAdvancedPage } from './pages/elasticsearch/node_advanced_page';
import { ElasticsearchCcrPage } from './pages/elasticsearch/ccr_page';
import { ElasticsearchCcrShardPage } from './pages/elasticsearch/ccr_shard_page';
import { EntSearchOverviewPage } from './pages/enterprise_search/overview';
import { MonitoringTimeContainer } from './hooks/use_monitoring_time';
import { BreadcrumbContainer } from './hooks/use_breadcrumbs';
import { HeaderActionMenuContext } from './contexts/header_action_menu_context';
import { LogStashOverviewPage } from './pages/logstash/overview';
import { LogStashNodesPage } from './pages/logstash/nodes';
import { LogStashPipelinesPage } from './pages/logstash/pipelines';
import { LogStashPipelinePage } from './pages/logstash/pipeline';
import { BeatsInstancesPage } from './pages/beats/instances';
import { LogStashNodeAdvancedPage } from './pages/logstash/advanced';
// import { LogStashNodePipelinesPage } from './pages/logstash/node_pipelines';
import { LogStashNodePage } from './pages/logstash/node';
import { LogStashNodePipelinesPage } from './pages/logstash/node_pipelines';
import { AccessDeniedPage } from './pages/access_denied';

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

  return (
    <KibanaContextProvider services={{ ...core, ...plugins }}>
      <ExternalConfigContext.Provider value={externalConfig}>
        <GlobalStateProvider
          query={plugins.data.query}
          toasts={core.notifications.toasts}
          uiSettings={core.uiSettings}
        >
          <HeaderActionMenuContext.Provider value={{ setHeaderActionMenu, theme$ }}>
            <MonitoringTimeContainer.Provider>
              <BreadcrumbContainer.Provider history={history}>
                <Router history={history}>
                  <Switch>
                    <Route path="/access-denied" component={AccessDeniedPage} />
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
                      component={ClusterListing}
                      codePaths={['all']}
                      fetchAllClusters={true}
                      unsetGlobalState={true}
                    />
                    <RouteInit
                      path="/overview"
                      component={ClusterOverview}
                      codePaths={['all']}
                      fetchAllClusters={false}
                    />

                    {/* ElasticSearch Views */}
                    <RouteInit
                      path="/elasticsearch/ml_jobs"
                      component={ElasticsearchMLJobsPage}
                      codePaths={[CODE_PATH_ELASTICSEARCH]}
                      fetchAllClusters={false}
                    />

                    <RouteInit
                      path="/elasticsearch/ccr/:index/shard/:shardId"
                      component={ElasticsearchCcrShardPage}
                      codePaths={[CODE_PATH_ELASTICSEARCH]}
                      fetchAllClusters={false}
                    />

                    <RouteInit
                      path="/elasticsearch/ccr"
                      component={ElasticsearchCcrPage}
                      codePaths={[CODE_PATH_ELASTICSEARCH]}
                      fetchAllClusters={false}
                    />

                    <RouteInit
                      path="/elasticsearch/indices/:index/advanced"
                      component={ElasticsearchIndexAdvancedPage}
                      codePaths={[CODE_PATH_ELASTICSEARCH]}
                      fetchAllClusters={false}
                    />

                    <RouteInit
                      path="/elasticsearch/indices/:index"
                      component={ElasticsearchIndexPage}
                      codePaths={[CODE_PATH_ELASTICSEARCH]}
                      fetchAllClusters={false}
                    />

                    <RouteInit
                      path="/elasticsearch/indices"
                      component={ElasticsearchIndicesPage}
                      codePaths={[CODE_PATH_ELASTICSEARCH]}
                      fetchAllClusters={false}
                    />

                    <RouteInit
                      path="/elasticsearch/nodes/:node/advanced"
                      component={ElasticsearchNodeAdvancedPage}
                      codePaths={[CODE_PATH_ELASTICSEARCH]}
                      fetchAllClusters={false}
                    />

                    <RouteInit
                      path="/elasticsearch/nodes/:node"
                      component={ElasticsearchNodePage}
                      codePaths={[CODE_PATH_ELASTICSEARCH]}
                      fetchAllClusters={false}
                    />

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

                    {/* Kibana Views */}
                    <RouteInit
                      path="/kibana/instances/:instance"
                      component={KibanaInstancePage}
                      codePaths={[CODE_PATH_KIBANA]}
                      fetchAllClusters={false}
                    />

                    <RouteInit
                      path="/kibana/instances"
                      component={KibanaInstancesPage}
                      codePaths={[CODE_PATH_KIBANA]}
                      fetchAllClusters={false}
                    />

                    <RouteInit
                      path="/kibana"
                      component={KibanaOverviewPage}
                      codePaths={[CODE_PATH_KIBANA]}
                      fetchAllClusters={false}
                    />

                    {/* Beats Views */}
                    <RouteInit
                      path="/beats/beat/:instance"
                      component={BeatsInstancePage}
                      codePaths={[CODE_PATH_BEATS]}
                      fetchAllClusters={false}
                    />

                    <RouteInit
                      path="/beats/beats"
                      component={BeatsInstancesPage}
                      codePaths={[CODE_PATH_BEATS]}
                      fetchAllClusters={false}
                    />

                    <RouteInit
                      path="/beats"
                      component={BeatsOverviewPage}
                      codePaths={[CODE_PATH_BEATS]}
                      fetchAllClusters={false}
                    />

                    {/* Logstash Routes */}
                    <RouteInit
                      path="/logstash/nodes"
                      component={LogStashNodesPage}
                      codePaths={[CODE_PATH_LOGSTASH]}
                      fetchAllClusters={false}
                    />

                    <RouteInit
                      path="/logstash/node/:uuid/advanced"
                      component={LogStashNodeAdvancedPage}
                      codePaths={[CODE_PATH_LOGSTASH]}
                      fetchAllClusters={false}
                    />

                    <RouteInit
                      path="/logstash/node/:uuid/pipelines"
                      component={LogStashNodePipelinesPage}
                      codePaths={[CODE_PATH_LOGSTASH]}
                      fetchAllClusters={false}
                    />

                    <RouteInit
                      path="/logstash/node/:uuid"
                      component={LogStashNodePage}
                      codePaths={[CODE_PATH_LOGSTASH]}
                      fetchAllClusters={false}
                    />

                    <RouteInit
                      path="/logstash/pipelines/:id/:hash?"
                      component={LogStashPipelinePage}
                      codePaths={[CODE_PATH_LOGSTASH]}
                      fetchAllClusters={false}
                    />

                    <RouteInit
                      path="/logstash/pipelines"
                      component={LogStashPipelinesPage}
                      codePaths={[CODE_PATH_LOGSTASH]}
                      fetchAllClusters={false}
                    />

                    <RouteInit
                      path="/logstash"
                      component={LogStashOverviewPage}
                      codePaths={[CODE_PATH_LOGSTASH]}
                      fetchAllClusters={false}
                    />

                    {/* APM Views */}
                    <RouteInit
                      path="/apm/instances/:instance"
                      component={ApmInstancePage}
                      codePaths={[CODE_PATH_APM]}
                      fetchAllClusters={false}
                    />

                    <RouteInit
                      path="/apm/instances"
                      component={ApmInstancesPage}
                      codePaths={[CODE_PATH_APM]}
                      fetchAllClusters={false}
                    />

                    <RouteInit
                      path="/apm"
                      component={ApmOverviewPage}
                      codePaths={[CODE_PATH_APM]}
                      fetchAllClusters={false}
                    />

                    <RouteInit
                      path="/enterprise_search"
                      component={EntSearchOverviewPage}
                      codePaths={[CODE_PATH_ENTERPRISE_SEARCH]}
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
          </HeaderActionMenuContext.Provider>
        </GlobalStateProvider>
      </ExternalConfigContext.Provider>
    </KibanaContextProvider>
  );
};
