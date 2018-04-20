/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { find } from 'lodash';
import uiRoutes from 'ui/routes';
import { routeInitProvider } from 'plugins/monitoring/lib/route_init';
import { MonitoringViewBaseTableController } from '../../';
import { getPageData } from './get_page_data';
import template from './index.html';

uiRoutes.when('/elasticsearch/indices', {
  template,
  resolve: {
    clusters: function (Private) {
      const routeInit = Private(routeInitProvider);
      return routeInit();
    },
    pageData: getPageData
  },
  controllerAs: 'esIndices',
  controller: class EsIndicesList extends MonitoringViewBaseTableController {

    constructor($injector, $scope) {
      super({
        title: 'Elasticsearch - Indices',
        storageKey: 'elasticsearch.indices',
        getPageData,
        $scope,
        $injector
      });

      const $route = $injector.get('$route');
      this.data = $route.current.locals.pageData;
      const globalState = $injector.get('globalState');
      $scope.cluster = find($route.current.locals.clusters, { cluster_uuid: globalState.cluster_uuid });

      // used in table toolbar
      const features = $injector.get('features');
      this.showSystemIndices = features.isEnabled('showSystemIndices', false);

      // for binding
      this.toggleShowSystemIndices = isChecked => {
        // flip the boolean
        this.showSystemIndices = isChecked;
        // preserve setting in localStorage
        features.update('showSystemIndices', isChecked);
        // update the page (resets pagination and sorting)
        this.updateData();
      };
    }

  }
});
