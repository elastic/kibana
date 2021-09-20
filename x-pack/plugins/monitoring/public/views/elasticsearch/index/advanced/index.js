/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Controller for Advanced Index Detail
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { uiRoutes } from '../../../../angular/helpers/routes';
import { ajaxErrorHandlersProvider } from '../../../../lib/ajax_error_handler';
import { routeInitProvider } from '../../../../lib/route_init';
import template from './index.html';
import { Legacy } from '../../../../legacy_shims';
import { AdvancedIndex } from '../../../../components/elasticsearch/index/advanced';
import { MonitoringViewBaseController } from '../../../base_controller';
import {
  CODE_PATH_ELASTICSEARCH,
  RULE_LARGE_SHARD_SIZE,
  ELASTICSEARCH_SYSTEM_ID,
} from '../../../../../common/constants';
import { SetupModeContext } from '../../../../components/setup_mode/setup_mode_context';
import { SetupModeRenderer } from '../../../../components/renderers';

function getPageData($injector) {
  const globalState = $injector.get('globalState');
  const $route = $injector.get('$route');
  const url = `../api/monitoring/v1/clusters/${globalState.cluster_uuid}/elasticsearch/indices/${$route.current.params.index}`;
  const $http = $injector.get('$http');
  const timeBounds = Legacy.shims.timefilter.getBounds();

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

uiRoutes.when('/elasticsearch/indices/:index/advanced', {
  template,
  resolve: {
    clusters: function (Private) {
      const routeInit = Private(routeInitProvider);
      return routeInit({ codePaths: [CODE_PATH_ELASTICSEARCH] });
    },
    pageData: getPageData,
  },
  controllerAs: 'monitoringElasticsearchAdvancedIndexApp',
  controller: class extends MonitoringViewBaseController {
    constructor($injector, $scope) {
      const $route = $injector.get('$route');
      const indexName = $route.current.params.index;

      super({
        title: i18n.translate('xpack.monitoring.elasticsearch.indices.advanced.routeTitle', {
          defaultMessage: 'Elasticsearch - Indices - {indexName} - Advanced',
          values: {
            indexName,
          },
        }),
        telemetryPageViewTitle: 'elasticsearch_index_advanced',
        defaultData: {},
        getPageData,
        reactNodeId: 'monitoringElasticsearchAdvancedIndexApp',
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

      $scope.$watch(
        () => this.data,
        (data) => {
          this.renderReact(
            <SetupModeRenderer
              scope={$scope}
              injector={$injector}
              productName={ELASTICSEARCH_SYSTEM_ID}
              render={({ setupMode, flyoutComponent, bottomBarComponent }) => (
                <SetupModeContext.Provider value={{ setupModeSupported: true }}>
                  {flyoutComponent}
                  <AdvancedIndex
                    scope={$scope}
                    setupMode={setupMode}
                    alerts={this.alerts}
                    indexSummary={data.indexSummary}
                    metrics={data.metrics}
                    onBrush={this.onBrush}
                    zoomInfo={this.zoomInfo}
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
