/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * Logstash Overview
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { uiRoutes } from '../../../angular/helpers/routes';
import { ajaxErrorHandlersProvider } from '../../../lib/ajax_error_handler';
import { routeInitProvider } from '../../../lib/route_init';
import template from './index.html';
import { Legacy } from '../../../legacy_shims';
import { Overview } from '../../../components/logstash/overview';
import { MonitoringViewBaseController } from '../../base_controller';
import { CODE_PATH_LOGSTASH } from '../../../../common/constants';

function getPageData($injector) {
  const $http = $injector.get('$http');
  const globalState = $injector.get('globalState');
  const url = `../api/monitoring/v1/clusters/${globalState.cluster_uuid}/logstash`;
  const timeBounds = Legacy.shims.timefilter.getBounds();

  return $http
    .post(url, {
      ccs: globalState.ccs,
      timeRange: {
        min: timeBounds.min.toISOString(),
        max: timeBounds.max.toISOString(),
      },
    })
    .then((response) => response.data)
    .catch((err) => {
      const Private = $injector.get('Private');
      const ajaxErrorHandlers = Private(ajaxErrorHandlersProvider);
      return ajaxErrorHandlers(err);
    });
}

uiRoutes.when('/logstash', {
  template,
  resolve: {
    clusters: function (Private) {
      const routeInit = Private(routeInitProvider);
      return routeInit({ codePaths: [CODE_PATH_LOGSTASH] });
    },
    pageData: getPageData,
  },
  controller: class extends MonitoringViewBaseController {
    constructor($injector, $scope) {
      super({
        title: 'Logstash',
        pageTitle: i18n.translate('xpack.monitoring.logstash.overview.pageTitle', {
          defaultMessage: 'Logstash overview',
        }),
        getPageData,
        reactNodeId: 'monitoringLogstashOverviewApp',
        $scope,
        $injector,
      });

      $scope.$watch(
        () => this.data,
        (data) => {
          this.renderReact(
            <Overview
              stats={data.clusterStatus}
              metrics={data.metrics}
              onBrush={this.onBrush}
              zoomInfo={this.zoomInfo}
            />
          );
        }
      );
    }
  },
});
