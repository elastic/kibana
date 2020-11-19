/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * Controller for Advanced Node Detail
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { get } from 'lodash';
import { uiRoutes } from '../../../../angular/helpers/routes';
import { ajaxErrorHandlersProvider } from '../../../../lib/ajax_error_handler';
import { routeInitProvider } from '../../../../lib/route_init';
import template from './index.html';
import { Legacy } from '../../../../legacy_shims';
import { AdvancedNode } from '../../../../components/elasticsearch/node/advanced';
import { MonitoringViewBaseController } from '../../../base_controller';
import {
  CODE_PATH_ELASTICSEARCH,
  ALERT_CPU_USAGE,
  ALERT_THREAD_POOL_SEARCH_REJECTIONS,
  ALERT_THREAD_POOL_WRITE_REJECTIONS,
  ALERT_MISSING_MONITORING_DATA,
  ALERT_DISK_USAGE,
  ALERT_MEMORY_USAGE,
} from '../../../../../common/constants';

function getPageData($injector) {
  const $http = $injector.get('$http');
  const globalState = $injector.get('globalState');
  const $route = $injector.get('$route');
  const timeBounds = Legacy.shims.timefilter.getBounds();
  const url = `../api/monitoring/v1/clusters/${globalState.cluster_uuid}/elasticsearch/nodes/${$route.current.params.node}`;

  return $http
    .post(url, {
      ccs: globalState.ccs,
      timeRange: {
        min: timeBounds.min.toISOString(),
        max: timeBounds.max.toISOString(),
      },
      is_advanced: true,
    })
    .then((response) => response.data)
    .catch((err) => {
      const Private = $injector.get('Private');
      const ajaxErrorHandlers = Private(ajaxErrorHandlersProvider);
      return ajaxErrorHandlers(err);
    });
}

uiRoutes.when('/elasticsearch/nodes/:node/advanced', {
  template,
  resolve: {
    clusters: function (Private) {
      const routeInit = Private(routeInitProvider);
      return routeInit({ codePaths: [CODE_PATH_ELASTICSEARCH] });
    },
    pageData: getPageData,
  },
  controller: class extends MonitoringViewBaseController {
    constructor($injector, $scope) {
      const $route = $injector.get('$route');
      const nodeName = $route.current.params.node;

      super({
        defaultData: {},
        getPageData,
        reactNodeId: 'monitoringElasticsearchAdvancedNodeApp',
        telemetryPageViewTitle: 'elasticsearch_node_advanced',
        $scope,
        $injector,
        alerts: {
          shouldFetch: true,
          options: {
            alertTypeIds: [
              ALERT_CPU_USAGE,
              ALERT_DISK_USAGE,
              ALERT_THREAD_POOL_SEARCH_REJECTIONS,
              ALERT_THREAD_POOL_WRITE_REJECTIONS,
              ALERT_MEMORY_USAGE,
              ALERT_MISSING_MONITORING_DATA,
            ],
            filters: [
              {
                nodeUuid: nodeName,
              },
            ],
          },
        },
      });

      $scope.$watch(
        () => this.data,
        (data) => {
          if (!data || !data.nodeSummary) {
            return;
          }

          this.setTitle(
            i18n.translate('xpack.monitoring.elasticsearch.node.advanced.routeTitle', {
              defaultMessage: 'Elasticsearch - Nodes - {nodeSummaryName} - Advanced',
              values: {
                nodeSummaryName: get(data, 'nodeSummary.name'),
              },
            })
          );

          this.setPageTitle(
            i18n.translate('xpack.monitoring.elasticsearch.node.overview.pageTitle', {
              defaultMessage: 'Elasticsearch node: {node}',
              values: {
                node: get(data, 'nodeSummary.name'),
              },
            })
          );

          this.renderReact(
            <AdvancedNode
              nodeSummary={data.nodeSummary}
              alerts={this.alerts}
              nodeId={data.nodeSummary.resolver}
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
