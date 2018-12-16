/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * Kibana Overview
 */
import React from 'react';
import { render } from 'react-dom';
import { find } from 'lodash';
import uiRoutes from'ui/routes';
import { MonitoringTimeseriesContainer } from '../../../components/chart';
import { ajaxErrorHandlersProvider } from 'plugins/monitoring/lib/ajax_error_handler';
import { routeInitProvider } from 'plugins/monitoring/lib/route_init';
import template from './index.html';
import { timefilter } from 'ui/timefilter';
import { EuiPage, EuiPageBody, EuiPageContent, EuiSpacer, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { ClusterStatus } from '../../../components/kibana/cluster_status';
import { I18nProvider } from '@kbn/i18n/react';

function getPageData($injector) {
  const $http = $injector.get('$http');
  const globalState = $injector.get('globalState');
  const url = `../api/monitoring/v1/clusters/${globalState.cluster_uuid}/kibana`;
  const timeBounds = timefilter.getBounds();

  return $http.post(url, {
    ccs: globalState.ccs,
    timeRange: {
      min: timeBounds.min.toISOString(),
      max: timeBounds.max.toISOString()
    }
  })
    .then(response => response.data)
    .catch((err) => {
      const Private = $injector.get('Private');
      const ajaxErrorHandlers = Private(ajaxErrorHandlersProvider);
      return ajaxErrorHandlers(err);
    });
}

uiRoutes.when('/kibana', {
  template,
  resolve: {
    clusters: function (Private) {
      const routeInit = Private(routeInitProvider);
      return routeInit();
    },
    pageData: getPageData
  },
  controller($injector, $scope) {
    timefilter.enableTimeRangeSelector();
    timefilter.enableAutoRefreshSelector();

    const $route = $injector.get('$route');
    const globalState = $injector.get('globalState');
    $scope.cluster = find($route.current.locals.clusters, { cluster_uuid: globalState.cluster_uuid });
    $scope.pageData = $route.current.locals.pageData;

    const title = $injector.get('title');
    title($scope.cluster, 'Kibana');

    const $executor = $injector.get('$executor');
    $executor.register({
      execute: () => getPageData($injector),
      handleResponse: (response) => $scope.pageData = response
    });

    $executor.start($scope);

    $scope.$on('$destroy', $executor.destroy);

    $scope.$watch('pageData', renderReact);
    renderReact();

    function renderReact() {
      const app =  document.getElementById('monitoringKibanaOverviewApp');
      if (!app) {
        return;
      }

      const overviewPage = (
        <I18nProvider>
          <EuiPage>
            <EuiPageBody>
              <EuiPageContent>
                <ClusterStatus stats={$scope.pageData.clusterStatus} />
                <EuiSpacer size="m"/>
                <EuiFlexGroup>
                  <EuiFlexItem grow={true}>
                    <MonitoringTimeseriesContainer
                      series={$scope.pageData.metrics.kibana_cluster_requests}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem grow={true}>
                    <MonitoringTimeseriesContainer
                      series={$scope.pageData.metrics.kibana_cluster_response_times}
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>

              </EuiPageContent>
            </EuiPageBody>
          </EuiPage>
        </I18nProvider>
      );

      render(overviewPage, app);
    }
  }
});
