/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { find, get } from 'lodash';
import uiRoutes from 'ui/routes';
import template from './index.html';
import { MonitoringViewBaseController } from 'plugins/monitoring/views';
import { routeInitProvider } from 'plugins/monitoring/lib/route_init';
import { ajaxErrorHandlersProvider } from 'plugins/monitoring/lib/ajax_error_handler';
import { timefilter } from 'ui/timefilter';

function getPageData($injector) {
  const globalState = $injector.get('globalState');
  const $http = $injector.get('$http');
  const Private = $injector.get('Private');
  const url = `../api/monitoring/v1/clusters/${globalState.cluster_uuid}/alerts`;

  const timeBounds = timefilter.getBounds();

  return $http.post(url, {
    ccs: globalState.ccs,
    timeRange: {
      min: timeBounds.min.toISOString(),
      max: timeBounds.max.toISOString()
    }
  })
    .then(response => get(response, 'data', []))
    .catch((err) => {
      const ajaxErrorHandlers = Private(ajaxErrorHandlersProvider);
      return ajaxErrorHandlers(err);
    });
}

uiRoutes.when('/alerts', {
  template,
  resolve: {
    clusters(Private) {
      const routeInit = Private(routeInitProvider);
      return routeInit();
    },
    alerts: getPageData
  },
  controllerAs: 'alerts',
  controller: class AlertsView extends MonitoringViewBaseController {
    constructor($injector, $scope, i18n) {
      const $route = $injector.get('$route');
      const globalState = $injector.get('globalState');

      // breadcrumbs + page title
      $scope.cluster = find($route.current.locals.clusters, { cluster_uuid: globalState.cluster_uuid });

      super({
        title: i18n('xpack.monitoring.alerts.clusterAlertsTitle', { defaultMessage: 'Cluster Alerts' }),
        getPageData,
        $scope,
        $injector
      });

      this.data = $route.current.locals.alerts;
    }
  }
});
