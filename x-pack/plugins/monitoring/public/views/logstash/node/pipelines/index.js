/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * Logstash Node Pipelines Listing
 */

import { find } from 'lodash';
import uiRoutes from 'ui/routes';
import { ajaxErrorHandlersProvider } from 'plugins/monitoring/lib/ajax_error_handler';
import { routeInitProvider } from 'plugins/monitoring/lib/route_init';
import {
  isPipelineMonitoringSupportedInVersion
} from 'plugins/monitoring/lib/logstash/pipelines';
import template from './index.html';
import { timefilter } from 'ui/timefilter';

const getPageData = ($injector) => {
  const $route = $injector.get('$route');
  const $http = $injector.get('$http');
  const globalState = $injector.get('globalState');
  const Private = $injector.get('Private');

  const logstashUuid = $route.current.params.uuid;
  const url = `../api/monitoring/v1/clusters/${globalState.cluster_uuid}/logstash/node/${logstashUuid}/pipelines`;
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
      const ajaxErrorHandlers = Private(ajaxErrorHandlersProvider);
      return ajaxErrorHandlers(err);
    });
};

function makeUpgradeMessage(logstashVersion, i18n) {
  if (isPipelineMonitoringSupportedInVersion(logstashVersion)) {
    return null;
  }

  return i18n('xpack.monitoring.logstash.node.pipelines.notAvailableDescription', {
    defaultMessage:
    'Pipeline monitoring is only available in Logstash version 6.0.0 or higher. This node is running version {logstashVersion}.',
    values: {
      logstashVersion
    }
  });
}

uiRoutes
  .when('/logstash/node/:uuid/pipelines', {
    template,
    resolve: {
      clusters(Private) {
        const routeInit = Private(routeInitProvider);
        return routeInit();
      },
      pageData: getPageData
    },
    controller($injector, $scope, i18n) {
      const $route = $injector.get('$route');
      const globalState = $injector.get('globalState');
      const title = $injector.get('title');
      const $executor = $injector.get('$executor');

      $scope.cluster = find($route.current.locals.clusters, { cluster_uuid: globalState.cluster_uuid });
      $scope.pageData = $route.current.locals.pageData;

      $scope.upgradeMessage = makeUpgradeMessage($scope.pageData.nodeSummary.version, i18n);
      timefilter.enableTimeRangeSelector();
      timefilter.enableAutoRefreshSelector();

      const routeTitle = i18n('xpack.monitoring.logstash.node.pipelines.routeTitle', {
        defaultMessage: 'Logstash - {nodeName} - Pipelines',
        values: {
          nodeName: $scope.pageData.nodeSummary.name
        }
      });
      title($scope.cluster, routeTitle);

      $executor.register({
        execute: () => getPageData($injector),
        handleResponse: (response) => $scope.pageData = response
      });

      $executor.start($scope);

      $scope.$on('$destroy', $executor.destroy);
    }
  });
