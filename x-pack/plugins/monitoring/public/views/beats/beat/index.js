/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { find } from 'lodash';
import uiRoutes from'ui/routes';
import { routeInitProvider } from 'plugins/monitoring/lib/route_init';
import { MonitoringViewBaseController } from '../../';
import { getPageData } from './get_page_data';
import template from './index.html';

uiRoutes.when('/beats/beat/:beatUuid', {
  template,
  resolve: {
    clusters: function (Private) {
      const routeInit = Private(routeInitProvider);
      return routeInit();
    },
    pageData: getPageData,
  },
  controllerAs: 'beat',
  controller: class BeatDetail extends MonitoringViewBaseController {
    constructor($injector, $scope) {
      // breadcrumbs + page title
      const $route = $injector.get('$route');
      const globalState = $injector.get('globalState');
      $scope.cluster = find($route.current.locals.clusters, { cluster_uuid: globalState.cluster_uuid });

      const pageData = $route.current.locals.pageData;
      super({
        title: `Beats - ${pageData.summary.name} - Overview`,
        getPageData,
        $scope,
        $injector
      });

      this.data = pageData;
    }
  }
});
