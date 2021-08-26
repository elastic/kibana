/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Controller for single index detail
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { uiRoutes } from '../../../angular/helpers/routes';
import { routeInitProvider } from '../../../lib/route_init';
import { ajaxErrorHandlersProvider } from '../../../lib/ajax_error_handler';
import template from './index.html';
import { Legacy } from '../../../legacy_shims';
import { labels } from '../../../components/elasticsearch/shard_allocation/lib/labels';
import { indicesByNodes } from '../../../components/elasticsearch/shard_allocation/transformers/indices_by_nodes';
import { Index } from '../../../components/elasticsearch/index/index';
import { MonitoringViewBaseController } from '../../base_controller';
import {
  CODE_PATH_ELASTICSEARCH,
  RULE_LARGE_SHARD_SIZE,
  ELASTICSEARCH_SYSTEM_ID,
} from '../../../../common/constants';
import { SetupModeContext } from '../../../components/setup_mode/setup_mode_context';
import { SetupModeRenderer } from '../../../components/renderers';

function getPageData($injector) {
  const $http = $injector.get('$http');
  const $route = $injector.get('$route');
  const globalState = $injector.get('globalState');
  const url = `../api/monitoring/v1/clusters/${globalState.cluster_uuid}/elasticsearch/indices/${$route.current.params.index}`;
  const timeBounds = Legacy.shims.timefilter.getBounds();

  return $http
    .post(url, {
      ccs: globalState.ccs,
      timeRange: {
        min: timeBounds.min.toISOString(),
        max: timeBounds.max.toISOString(),
      },
      is_advanced: false,
    })
    .then((response) => response.data)
    .catch((err) => {
      const Private = $injector.get('Private');
      const ajaxErrorHandlers = Private(ajaxErrorHandlersProvider);
      return ajaxErrorHandlers(err);
    });
}

uiRoutes.when('/elasticsearch/indices/:index', {
  template,
  resolve: {
    clusters(Private) {
      const routeInit = Private(routeInitProvider);
      return routeInit({ codePaths: [CODE_PATH_ELASTICSEARCH] });
    },
    pageData: getPageData,
  },
  controllerAs: 'monitoringElasticsearchIndexApp',
  controller: class extends MonitoringViewBaseController {
    constructor($injector, $scope) {
      const $route = $injector.get('$route');
      const indexName = $route.current.params.index;

      super({
        title: i18n.translate('xpack.monitoring.elasticsearch.indices.overview.routeTitle', {
          defaultMessage: 'Elasticsearch - Indices - {indexName} - Overview',
          values: {
            indexName,
          },
        }),
        telemetryPageViewTitle: 'elasticsearch_index',
        pageTitle: i18n.translate('xpack.monitoring.elasticsearch.indices.overview.pageTitle', {
          defaultMessage: 'Index: {indexName}',
          values: {
            indexName,
          },
        }),
        defaultData: {},
        getPageData,
        reactNodeId: 'monitoringElasticsearchIndexApp',
        $scope,
        $injector,
        alerts: {
          shouldFetch: true,
          options: {
            alertTypeIds: [RULE_LARGE_SHARD_SIZE],
            filters: [
              {
                shardIndex: $route.current.pathParams.index,
              },
            ],
          },
        },
      });

      this.indexName = indexName;
      const transformer = indicesByNodes();

      $scope.$watch(
        () => this.data,
        (data) => {
          if (!data || !data.shards) {
            return;
          }

          const shards = data.shards;
          $scope.totalCount = shards.length;
          $scope.showing = transformer(shards, data.nodes);
          $scope.labels = labels.node;
          if (shards.some((shard) => shard.state === 'UNASSIGNED')) {
            $scope.labels = labels.indexWithUnassigned;
          } else {
            $scope.labels = labels.index;
          }

          this.renderReact(
            <SetupModeRenderer
              scope={$scope}
              injector={$injector}
              productName={ELASTICSEARCH_SYSTEM_ID}
              render={({ setupMode, flyoutComponent, bottomBarComponent }) => (
                <SetupModeContext.Provider value={{ setupModeSupported: true }}>
                  {flyoutComponent}
                  <Index
                    scope={$scope}
                    setupMode={setupMode}
                    alerts={this.alerts}
                    onBrush={this.onBrush}
                    indexUuid={this.indexName}
                    clusterUuid={$scope.cluster.cluster_uuid}
                    zoomInfo={this.zoomInfo}
                    {...data}
                  />
                  {bottomBarComponent}
                </SetupModeContext.Provider>
              )}
            />
          );
        }
      );
    }
  },
});
