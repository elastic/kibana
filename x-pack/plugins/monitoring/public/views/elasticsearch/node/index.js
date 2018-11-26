/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * Controller for Node Detail
 */
import React from 'react';
import { render } from 'react-dom';
import { find, partial } from 'lodash';
import uiRoutes from 'ui/routes';
import { routeInitProvider } from 'plugins/monitoring/lib/route_init';
import { getPageData } from './get_page_data';
import template from './index.html';
import { timefilter } from 'ui/timefilter';
import { Node } from '../../../components/elasticsearch/node/node';
import { I18nProvider } from '@kbn/i18n/react';
import { labels } from '../../../components/elasticsearch/shard_allocation/lib/labels';
import { nodesByIndices } from '../../../components/elasticsearch/shard_allocation/transformers/nodes_by_indices';

uiRoutes.when('/elasticsearch/nodes/:node', {
  template,
  resolve: {
    clusters: function (Private) {
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

    const title = $injector.get('title');
    const routeTitle = i18n('xpack.monitoring.elasticsearch.node.overview.routeTitle', {
      defaultMessage: 'Elasticsearch - Nodes - {nodeSummaryName} - Overview',
      values: {
        nodeSummaryName: $scope.pageData.nodeSummary.name
      }
    });

    title($scope.cluster, routeTitle);

    const features = $injector.get('features');
    const callPageData = partial(getPageData, $injector);
    // show/hide system indices in shard allocation view
    $scope.showSystemIndices = features.isEnabled('showSystemIndices', false);
    $scope.toggleShowSystemIndices = (isChecked) => {
      $scope.showSystemIndices = isChecked;
      // preserve setting in localStorage
      features.update('showSystemIndices', isChecked);
      // update the page
      callPageData().then((pageData) => $scope.pageData = pageData);
    };

    const $executor = $injector.get('$executor');
    $executor.register({
      execute: () => callPageData(),
      handleResponse: (response) => {
        $scope.pageData = response;
      }
    });

    $executor.start($scope);

    $scope.$on('$destroy', $executor.destroy);

    const transformer = nodesByIndices();
    this.renderReact = () => {
      const shards = $scope.pageData.shards;
      $scope.totalCount = shards.length;
      $scope.showing = transformer(shards, $scope.pageData.nodes);
      $scope.labels = labels.node;

      render(
        <I18nProvider>
          <Node
            scope={$scope}
            kbnUrl={kbnUrl}
            {...$scope.pageData}
          />
        </I18nProvider>,
        document.getElementById('monitoringElasticsearchNodeApp')
      );
    };

    $scope.$watch('pageData', this.renderReact);
  }
});
