/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * Controller for Advanced Node Detail
 */
import React from 'react';
import uiRoutes from 'ui/routes';
import { ajaxErrorHandlersProvider } from 'plugins/monitoring/lib/ajax_error_handler';
import { routeInitProvider } from 'plugins/monitoring/lib/route_init';
import template from './index.html';
import { timefilter } from 'ui/timefilter';
import { I18nProvider } from '@kbn/i18n/react';
import { MonitoringViewBaseController } from '../../../base_controller';
import { Logs } from '../../../../components/logs';

function getPageData($injector) {
  const $http = $injector.get('$http');
  const globalState = $injector.get('globalState');
  const $route = $injector.get('$route');
  const timeBounds = timefilter.getBounds();
  const url = `../api/monitoring/v1/clusters/${globalState.cluster_uuid}/elasticsearch/nodes/${$route.current.params.node}/logs`;

  return $http.post(url, {
    ccs: globalState.ccs,
    timeRange: {
      min: timeBounds.min.toISOString(),
      max: timeBounds.max.toISOString()
    },
  })
    .then(response => response.data)
    .catch((err) => {
      const Private = $injector.get('Private');
      const ajaxErrorHandlers = Private(ajaxErrorHandlersProvider);
      return ajaxErrorHandlers(err);
    });
}

uiRoutes.when('/elasticsearch/nodes/:node/logs', {
  template,
  resolve: {
    clusters: function (Private) {
      const routeInit = Private(routeInitProvider);
      return routeInit();
    },
    pageData: getPageData
  },
  controller: class extends MonitoringViewBaseController {
    constructor($injector, $scope, i18n) {
      super({
        defaultData: {},
        getPageData,
        reactNodeId: 'monitoringElasticsearchLogsNodeApp',
        $scope,
        $injector
      });

      $scope.$watch(() => this.data, data => {
        if (!data || !data.logs) {
          return;
        }

        this.setTitle(i18n('xpack.monitoring.elasticsearch.node.logs.routeTitle', {
          defaultMessage: 'Elasticsearch - Nodes - {nodeSummaryName} - Logs',
          values: {
            nodeSummaryName: data.nodeSummary.name
          }
        }));

        this.renderReact(
          <I18nProvider>
            <Logs
              logs={data.logs}
              // fetchLogs={}
            />
          </I18nProvider>
        );
      });
    }
  }
});
