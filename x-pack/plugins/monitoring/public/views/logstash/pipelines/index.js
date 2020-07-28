/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { find } from 'lodash';
import { uiRoutes } from '../../../angular/helpers/routes';
import { ajaxErrorHandlersProvider } from '../../../lib/ajax_error_handler';
import { routeInitProvider } from '../../../lib/route_init';
import { isPipelineMonitoringSupportedInVersion } from '../../../lib/logstash/pipelines';
import template from './index.html';
import { Legacy } from '../../../legacy_shims';
import { PipelineListing } from '../../../components/logstash/pipeline_listing/pipeline_listing';
import { MonitoringViewBaseEuiTableController } from '../..';
import { CODE_PATH_LOGSTASH } from '../../../../common/constants';

/*
 * Logstash Pipelines Listing page
 */

const getPageData = ($injector, _api = undefined, routeOptions = {}) => {
  _api; // to fix eslint
  const $http = $injector.get('$http');
  const globalState = $injector.get('globalState');
  const Private = $injector.get('Private');

  const url = `../api/monitoring/v1/clusters/${globalState.cluster_uuid}/logstash/pipelines`;
  const timeBounds = Legacy.shims.timefilter.getBounds();

  return $http
    .post(url, {
      ccs: globalState.ccs,
      timeRange: {
        min: timeBounds.min.toISOString(),
        max: timeBounds.max.toISOString(),
      },
      ...routeOptions,
    })
    .then((response) => response.data)
    .catch((err) => {
      const ajaxErrorHandlers = Private(ajaxErrorHandlersProvider);
      return ajaxErrorHandlers(err);
    });
};

function makeUpgradeMessage(logstashVersions) {
  if (
    !Array.isArray(logstashVersions) ||
    logstashVersions.length === 0 ||
    logstashVersions.some(isPipelineMonitoringSupportedInVersion)
  ) {
    return null;
  }

  return 'Pipeline monitoring is only available in Logstash version 6.0.0 or higher.';
}

uiRoutes.when('/logstash/pipelines', {
  template,
  resolve: {
    clusters(Private) {
      const routeInit = Private(routeInitProvider);
      return routeInit({ codePaths: [CODE_PATH_LOGSTASH] });
    },
  },
  controller: class LogstashPipelinesList extends MonitoringViewBaseEuiTableController {
    constructor($injector, $scope) {
      super({
        title: 'Logstash Pipelines',
        storageKey: 'logstash.pipelines',
        getPageData,
        reactNodeId: 'monitoringLogstashPipelinesApp',
        $scope,
        $injector,
        fetchDataImmediately: false, // We want to apply pagination before sending the first request
      });

      const $route = $injector.get('$route');
      const config = $injector.get('config');
      this.data = $route.current.locals.pageData;
      const globalState = $injector.get('globalState');
      $scope.cluster = find($route.current.locals.clusters, {
        cluster_uuid: globalState.cluster_uuid,
      });

      const renderReact = (pageData) => {
        if (!pageData) {
          return;
        }

        const upgradeMessage = pageData
          ? makeUpgradeMessage(pageData.clusterStatus.versions, i18n)
          : null;

        const pagination = {
          ...this.pagination,
          totalItemCount: pageData.totalPipelineCount,
        };

        super.renderReact(
          <PipelineListing
            className="monitoringLogstashPipelinesTable"
            onBrush={(xaxis) => this.onBrush({ xaxis })}
            stats={pageData.clusterStatus}
            data={pageData.pipelines}
            {...this.getPaginationTableProps(pagination)}
            upgradeMessage={upgradeMessage}
            dateFormat={config.get('dateFormat')}
          />
        );
      };

      $scope.$watch(
        () => this.data,
        (pageData) => {
          renderReact(pageData);
        }
      );
    }
  },
});
