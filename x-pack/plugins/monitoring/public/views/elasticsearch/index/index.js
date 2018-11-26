/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * Controller for single index detail
 */
import React from 'react';
import { render } from 'react-dom';
import { find } from 'lodash';
import moment from 'moment';
import uiRoutes from 'ui/routes';
import { routeInitProvider } from 'plugins/monitoring/lib/route_init';
import { ajaxErrorHandlersProvider } from 'plugins/monitoring/lib/ajax_error_handler';
import template from './index.html';
import { timefilter } from 'ui/timefilter';
import { I18nProvider } from '@kbn/i18n/react';
import { labels } from '../../../components/elasticsearch/shard_allocation/lib/labels';
import { indicesByNodes } from '../../../components/elasticsearch/shard_allocation/transformers/indices_by_nodes';
import { Index } from '../../../components/elasticsearch/index/index';

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
  controller($injector, $scope, i18n) {
    timefilter.enableTimeRangeSelector();
    timefilter.enableAutoRefreshSelector();

    const $route = $injector.get('$route');
    const kbnUrl = $injector.get('kbnUrl');
    const globalState = $injector.get('globalState');
    $scope.cluster = find($route.current.locals.clusters, { cluster_uuid: globalState.cluster_uuid });
    $scope.pageData = $route.current.locals.pageData;
    $scope.indexName = $route.current.params.index;

    const title = $injector.get('title');
    const routeTitle = i18n('xpack.monitoring.elasticsearch.indices.overview.routeTitle', {
      defaultMessage: 'Elasticsearch - Indices - {indexName} - Overview',
      values: {
        indexName: $scope.indexName
      }
    });

    title($scope.cluster, routeTitle);

    const $executor = $injector.get('$executor');
    $executor.register({
      execute: () => getPageData($injector),
      handleResponse: (response) => $scope.pageData = response
    });

    $executor.start($scope);

    $scope.$on('$destroy', $executor.destroy);

    function onBrush({ xaxis }) {
      timefilter.setTime({
        from: moment(xaxis.from),
        to: moment(xaxis.to),
        mode: 'absolute',
      });
    }

    const transformer = indicesByNodes();
    this.renderReact = () => {
      const shards = $scope.pageData.shards;
      $scope.totalCount = shards.length;
      $scope.showing = transformer(shards, $scope.pageData.nodes);
      if (shards.some((shard) => shard.state === 'UNASSIGNED')) {
        $scope.labels = labels.indexWithUnassigned;
      } else {
        $scope.labels = labels.index;
      }

      render(
        <I18nProvider>
          <Index
            scope={$scope}
            kbnUrl={kbnUrl}
            onBrush={onBrush}
            {...$scope.pageData}
          />
        </I18nProvider>,
        document.getElementById('monitoringElasticsearchIndexApp')
      );
    };

    $scope.$watch('pageData', this.renderReact);
  }
});
