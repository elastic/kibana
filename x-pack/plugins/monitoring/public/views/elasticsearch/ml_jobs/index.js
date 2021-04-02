/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { find } from 'lodash';
import { i18n } from '@kbn/i18n';
import { uiRoutes } from '../../../angular/helpers/routes';
import { routeInitProvider } from '../../../lib/route_init';
import { MonitoringViewBaseEuiTableController } from '../../';
import { getPageData } from './get_page_data';
import template from './index.html';
import { CODE_PATH_ELASTICSEARCH, CODE_PATH_ML } from '../../../../common/constants';

uiRoutes.when('/elasticsearch/ml_jobs', {
  template,
  resolve: {
    clusters: function (Private) {
      const routeInit = Private(routeInitProvider);
      return routeInit({ codePaths: [CODE_PATH_ELASTICSEARCH, CODE_PATH_ML] });
    },
    pageData: getPageData,
  },
  controllerAs: 'mlJobs',
  controller: class MlJobsList extends MonitoringViewBaseEuiTableController {
    constructor($injector, $scope) {
      super({
        title: i18n.translate('xpack.monitoring.elasticsearch.mlJobs.routeTitle', {
          defaultMessage: 'Elasticsearch - Machine Learning Jobs',
        }),
        pageTitle: i18n.translate('xpack.monitoring.elasticsearch.mlJobs.pageTitle', {
          defaultMessage: 'Elasticsearch machine learning jobs',
        }),
        storageKey: 'elasticsearch.mlJobs',
        getPageData,
        $scope,
        $injector,
      });

      const $route = $injector.get('$route');
      this.data = $route.current.locals.pageData;
      const globalState = $injector.get('globalState');
      $scope.cluster = find($route.current.locals.clusters, {
        cluster_uuid: globalState.cluster_uuid,
      });
      this.isCcrEnabled = Boolean($scope.cluster && $scope.cluster.isCcrEnabled);
    }
  },
});
