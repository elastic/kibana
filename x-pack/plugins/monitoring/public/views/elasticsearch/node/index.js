/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * Controller for Node Detail
 */
import { find, partial } from 'lodash';
import uiRoutes from 'ui/routes';
import { routeInitProvider } from 'plugins/monitoring/lib/route_init';
import { getPageData } from './get_page_data';
import template from './index.html';
import { timefilter } from 'ui/timefilter';

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
  }
});
