/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { find } from 'lodash';
import { i18n } from '@kbn/i18n';
import { uiRoutes } from '../../../angular/helpers/routes';
import { routeInitProvider } from '../../../lib/route_init';
import { MonitoringViewBaseController } from '../../';
import { getPageData } from './get_page_data';
import template from './index.html';
import {
  CODE_PATH_BEATS,
  ALERT_MISSING_MONITORING_DATA,
  BEATS_SYSTEM_ID,
} from '../../../../common/constants';
import { BeatsOverview } from '../../../components/beats/overview';

uiRoutes.when('/beats', {
  template,
  resolve: {
    clusters: function (Private) {
      const routeInit = Private(routeInitProvider);
      return routeInit({ codePaths: [CODE_PATH_BEATS] });
    },
    pageData: getPageData,
  },
  controllerAs: 'beats',
  controller: class extends MonitoringViewBaseController {
    constructor($injector, $scope) {
      // breadcrumbs + page title
      const $route = $injector.get('$route');
      const globalState = $injector.get('globalState');
      $scope.cluster = find($route.current.locals.clusters, {
        cluster_uuid: globalState.cluster_uuid,
      });

      super({
        title: i18n.translate('xpack.monitoring.beats.overview.routeTitle', {
          defaultMessage: 'Beats - Overview',
        }),
        pageTitle: i18n.translate('xpack.monitoring.beats.overview.pageTitle', {
          defaultMessage: 'Beats overview',
        }),
        getPageData,
        $scope,
        $injector,
        reactNodeId: 'monitoringBeatsOverviewApp',
        alerts: {
          shouldFetch: true,
          options: {
            alertTypeIds: [ALERT_MISSING_MONITORING_DATA],
            filters: [
              {
                stackProduct: BEATS_SYSTEM_ID,
              },
            ],
          },
        },
      });

      this.data = $route.current.locals.pageData;
      $scope.$watch(
        () => this.data,
        (data) => {
          this.renderReact(
            <BeatsOverview
              {...data}
              alerts={this.alerts}
              onBrush={$scope.onBrush}
              zoomInfo={$scope.zoomInfo}
            />
          );
        }
      );
    }
  },
});
