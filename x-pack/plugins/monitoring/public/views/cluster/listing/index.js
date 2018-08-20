/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uiRoutes from 'ui/routes';
import { routeInitProvider } from 'plugins/monitoring/lib/route_init';
import { MonitoringViewBaseTableController } from '../../';
import template from './index.html';

const getPageData = $injector => {
  const monitoringClusters = $injector.get('monitoringClusters');
  return monitoringClusters();
};

uiRoutes.when('/home', {
  template,
  resolve: {
    clusters: (Private, kbnUrl) => {
      const routeInit = Private(routeInitProvider);
      return routeInit()
        .then(clusters => {
          if (!clusters || !clusters.length) {
            kbnUrl.changePath('/no-data');
            return Promise.reject();
          }
          if (clusters.length === 1) {
          // Bypass the cluster listing if there is just 1 cluster
            kbnUrl.changePath('/overview');
            return Promise.reject();
          }
          return clusters;
        });
    }
  },
  controllerAs: 'clusters',
  controller: class ClustersList extends MonitoringViewBaseTableController {

    constructor($injector, $scope) {
      super({
        storageKey: 'clusters',
        getPageData,
        $scope,
        $injector
      });

      const $route = $injector.get('$route');
      this.data = $route.current.locals.clusters;
    }
  }
})
  .otherwise({ redirectTo: '/no-data' });
