/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uiRoutes from 'ui/routes';
import { routeInitProvider } from 'plugins/monitoring/lib/route_init';
import template from './index.html';

uiRoutes.when('/overview', {
  template,
  resolve: {
    clusters(Private) {
      // checks license info of all monitored clusters for multi-cluster monitoring usage and capability
      const routeInit = Private(routeInitProvider);
      return routeInit();
    },
    cluster(monitoringClusters, globalState) {
      return monitoringClusters(globalState.cluster_uuid, globalState.ccs);
    }
  },
  controller($injector, $scope) {
    const timefilter = $injector.get('timefilter');
    timefilter.enableTimeRangeSelector();
    timefilter.enableAutoRefreshSelector();

    const $route = $injector.get('$route');
    $scope.cluster = $route.current.locals.cluster;

    const title = $injector.get('title');
    title($scope.cluster, 'Overview');

    const $executor = $injector.get('$executor');
    const monitoringClusters = $injector.get('monitoringClusters');
    const globalState = $injector.get('globalState');
    $executor.register({
      execute: () => monitoringClusters(globalState.cluster_uuid, globalState.ccs),
      handleResponse(cluster) {
        $scope.cluster = cluster;
      }
    });

    $executor.start();

    $scope.$on('$destroy', $executor.destroy);
  }
});
