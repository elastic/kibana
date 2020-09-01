/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { uiRoutes } from '../../../angular/helpers/routes';
import { routeInitProvider } from '../../../lib/route_init';
import { MonitoringViewBaseEuiTableController } from '../../';
import template from './index.html';
import { Listing } from '../../../components/cluster/listing';
import { CODE_PATH_ALL } from '../../../../common/constants';

const CODE_PATHS = [CODE_PATH_ALL];

const getPageData = ($injector) => {
  const monitoringClusters = $injector.get('monitoringClusters');
  return monitoringClusters(undefined, undefined, CODE_PATHS);
};

uiRoutes
  .when('/home', {
    template,
    resolve: {
      clusters: (Private) => {
        const routeInit = Private(routeInitProvider);
        return routeInit({ codePaths: CODE_PATHS, fetchAllClusters: true }).then((clusters) => {
          if (!clusters || !clusters.length) {
            window.location.hash = '#/no-data';
            return Promise.reject();
          }
          if (clusters.length === 1) {
            // Bypass the cluster listing if there is just 1 cluster
            window.history.replaceState(null, null, '#/overview');
            return Promise.reject();
          }
          return clusters;
        });
      },
    },
    controllerAs: 'clusters',
    controller: class ClustersList extends MonitoringViewBaseEuiTableController {
      constructor($injector, $scope) {
        super({
          storageKey: 'clusters',
          getPageData,
          $scope,
          $injector,
          reactNodeId: 'monitoringClusterListingApp',
        });

        const $route = $injector.get('$route');
        const globalState = $injector.get('globalState');
        const storage = $injector.get('localStorage');
        const showLicenseExpiration = $injector.get('showLicenseExpiration');

        this.data = $route.current.locals.clusters;

        $scope.$watch(
          () => this.data,
          (data) => {
            this.renderReact(
              <Listing
                clusters={data}
                angular={{
                  scope: $scope,
                  globalState,
                  storage,
                  showLicenseExpiration,
                }}
                sorting={this.sorting}
                pagination={this.pagination}
                onTableChange={this.onTableChange}
              />
            );
          }
        );
      }
    },
  })
  .otherwise({ redirectTo: '/loading' });
