/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * Controller for single index detail
 */
import React from 'react';
import uiRoutes from 'ui/routes';
import { routeInitProvider } from 'plugins/monitoring/lib/route_init';
import { ajaxErrorHandlersProvider } from 'plugins/monitoring/lib/ajax_error_handler';
import template from './index.html';
import { timefilter } from 'ui/timefilter';
import { I18nProvider } from '@kbn/i18n/react';
import { labels } from '../../../components/elasticsearch/shard_allocation/lib/labels';
import { indicesByNodes } from '../../../components/elasticsearch/shard_allocation/transformers/indices_by_nodes';
import { Index } from '../../../components/elasticsearch/index/index';
import { MonitoringViewBaseController } from '../../base_controller';

function getPageData($injector) {
  const $http = $injector.get('$http');
  const $route = $injector.get('$route');
  const globalState = $injector.get('globalState');
  const url = `../api/monitoring/v1/clusters/${globalState.cluster_uuid}/elasticsearch/indices/${$route.current.params.index}`;
  const timeBounds = timefilter.getBounds();

  return $http.post(url, {
    ccs: globalState.ccs,
    timeRange: {
      min: timeBounds.min.toISOString(),
      max: timeBounds.max.toISOString()
    },
    is_advanced: false,
  })
    .then(response => response.data)
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
      return routeInit();
    },
    pageData: getPageData
  },
  controllerAs: 'monitoringElasticsearchIndexApp',
  controller: class extends MonitoringViewBaseController {
    constructor($injector, $scope, i18n) {
      const $route = $injector.get('$route');
      const kbnUrl = $injector.get('kbnUrl');
      const indexName = $route.current.params.index;

      super({
        title: i18n('xpack.monitoring.elasticsearch.indices.overview.routeTitle', {
          defaultMessage: 'Elasticsearch - Indices - {indexName} - Overview',
          values: {
            indexName,
          }
        }),
        defaultData: {},
        getPageData,
        reactNodeId: 'monitoringElasticsearchIndexApp',
        $scope,
        $injector
      });

      this.indexName = indexName;
      const transformer = indicesByNodes();

      $scope.$watch(() => this.data, data => {
        if (!data || !data.shards) {
          return;
        }

        const shards = data.shards;
        data.totalCount = shards.length;
        data.showing = transformer(shards, data.nodes);
        if (shards.some((shard) => shard.state === 'UNASSIGNED')) {
          data.labels = labels.indexWithUnassigned;
        } else {
          data.labels = labels.index;
        }

        this.renderReact(
          <I18nProvider>
            <Index
              scope={$scope}
              kbnUrl={kbnUrl}
              onBrush={this.onBrush}
              {...data}
            />
          </I18nProvider>
        );
      });
    }
  }
});
