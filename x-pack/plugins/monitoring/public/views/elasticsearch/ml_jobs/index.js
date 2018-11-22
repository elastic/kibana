/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { find } from 'lodash';
import uiRoutes from 'ui/routes';
import { routeInitProvider } from 'plugins/monitoring/lib/route_init';
import { MonitoringViewBaseTableController } from '../../';
import { getPageData } from './get_page_data';
import template from './index.html';

uiRoutes.when('/elasticsearch/ml_jobs', {
  template,
  resolve: {
    clusters: function (Private) {
      const routeInit = Private(routeInitProvider);
      return routeInit();
    },
    pageData: getPageData
  },
  controllerAs: 'mlJobs',
  controller: class MlJobsList extends MonitoringViewBaseTableController {

    constructor($injector, $scope, i18n) {
      super({
        title: i18n('xpack.monitoring.elasticsearch.mlJobs.routeTitle', {
          defaultMessage: 'Elasticsearch - Machine Learning Jobs'
        }),
        storageKey: 'elasticsearch.mlJobs',
        getPageData,
        $scope,
        $injector
      });

      const $route = $injector.get('$route');
      this.data = $route.current.locals.pageData;
      const globalState = $injector.get('globalState');
      $scope.cluster = find($route.current.locals.clusters, { cluster_uuid: globalState.cluster_uuid });
    }
  }
});
