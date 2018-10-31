/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * Logstash Node Pipeline View
 */
import { find } from 'lodash';
import uiRoutes from'ui/routes';
import { ajaxErrorHandlersProvider } from 'plugins/monitoring/lib/ajax_error_handler';
import { routeInitProvider } from 'plugins/monitoring/lib/route_init';
import { CALCULATE_DURATION_SINCE } from '../../../../common/constants';
import { formatTimestampToDuration } from '../../../../common/format_timestamp_to_duration';
import template from './index.html';
import { timefilter } from 'ui/timefilter';
import { i18n } from '@kbn/i18n';

function getPageData($injector) {
  const $route = $injector.get('$route');
  const $http = $injector.get('$http');
  const globalState = $injector.get('globalState');
  const minIntervalSeconds = $injector.get('minIntervalSeconds');
  const Private = $injector.get('Private');

  const { ccs, cluster_uuid: clusterUuid } = globalState;
  const pipelineId = $route.current.params.id;
  const pipelineHash = $route.current.params.hash || '';
  const url = `../api/monitoring/v1/clusters/${clusterUuid}/logstash/pipeline/${pipelineId}/${pipelineHash}`;
  return $http.post(url, {
    ccs
  })
    .then(response => response.data)
    .then(data => {
      data.versions = data.versions.map(version => {
        const relativeFirstSeen = formatTimestampToDuration(version.firstSeen, CALCULATE_DURATION_SINCE);
        const relativeLastSeen = formatTimestampToDuration(version.lastSeen, CALCULATE_DURATION_SINCE);

        const fudgeFactorSeconds = 2 * minIntervalSeconds;
        const isLastSeenCloseToNow = (Date.now() - version.lastSeen) <= fudgeFactorSeconds * 1000;

        return {
          ...version,
          relativeFirstSeen: i18n.translate('xpack.monitoring.logstash.pipeline.relativeFirstSeenAgoLabel', {
            defaultMessage: '{relativeFirstSeen} ago', values: { relativeFirstSeen }
          }),
          relativeLastSeen: isLastSeenCloseToNow ?
            i18n.translate('xpack.monitoring.logstash.pipeline.relativeLastSeenNowLabel', {
              defaultMessage: 'now'
            })
            : i18n.translate('xpack.monitoring.logstash.pipeline.relativeLastSeenAgoLabel', {
              defaultMessage: 'until {relativeLastSeen} ago', values: { relativeLastSeen }
            })
        };
      });

      return data;
    })
    .catch((err) => {
      const ajaxErrorHandlers = Private(ajaxErrorHandlersProvider);
      return ajaxErrorHandlers(err);
    });
}

uiRoutes.when('/logstash/pipelines/:id/:hash?', {
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
    const $executor = $injector.get('$executor');
    const globalState = $injector.get('globalState');
    const title = $injector.get('title');

    timefilter.disableTimeRangeSelector(); // Do not display time picker in UI
    timefilter.enableAutoRefreshSelector();

    function setClusters(clusters) {
      $scope.clusters = clusters;
      $scope.cluster = find($scope.clusters, { cluster_uuid: globalState.cluster_uuid });
    }
    setClusters($route.current.locals.clusters);
    $scope.pageData = $route.current.locals.pageData;
    title($scope.cluster, i18n('xpack.monitoring.logstash.pipeline.routeTitle', {
      defaultMessage: 'Logstash - Pipeline'
    }));

    $executor.register({
      execute: () => getPageData($injector),
      handleResponse: (response) => {
        $scope.pageData = response;
      }
    });
    $executor.start($scope);
    $scope.$on('$destroy', $executor.destroy);
  }
});
