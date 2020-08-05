/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { uiRoutes } from '../../../angular/helpers/routes';
import { routeInitProvider } from '../../../lib/route_init';
import { MonitoringViewBaseEuiTableController } from '../../';
import { getPageData } from './get_page_data';
import template from './index.html';
import { KibanaInstances } from '../../../components/kibana/instances';
import { SetupModeRenderer } from '../../../components/renderers';
import {
  KIBANA_SYSTEM_ID,
  CODE_PATH_KIBANA,
  ALERT_KIBANA_VERSION_MISMATCH,
} from '../../../../common/constants';

uiRoutes.when('/kibana/instances', {
  template,
  resolve: {
    clusters(Private) {
      const routeInit = Private(routeInitProvider);
      return routeInit({ codePaths: [CODE_PATH_KIBANA] });
    },
    pageData: getPageData,
  },
  controllerAs: 'kibanas',
  controller: class KibanaInstancesList extends MonitoringViewBaseEuiTableController {
    constructor($injector, $scope) {
      super({
        title: 'Kibana Instances',
        storageKey: 'kibana.instances',
        getPageData,
        reactNodeId: 'monitoringKibanaInstancesApp',
        $scope,
        $injector,
        alerts: {
          shouldFetch: true,
          options: {
            alertTypeIds: [ALERT_KIBANA_VERSION_MISMATCH],
          },
        },
      });

      const renderReact = () => {
        this.renderReact(
          <SetupModeRenderer
            scope={$scope}
            injector={$injector}
            productName={KIBANA_SYSTEM_ID}
            render={({ setupMode, flyoutComponent, bottomBarComponent }) => (
              <Fragment>
                {flyoutComponent}
                <KibanaInstances
                  instances={this.data.kibanas}
                  alerts={this.alerts}
                  setupMode={setupMode}
                  sorting={this.sorting}
                  pagination={this.pagination}
                  onTableChange={this.onTableChange}
                  clusterStatus={this.data.clusterStatus}
                />
                {bottomBarComponent}
              </Fragment>
            )}
          />
        );
      };

      $scope.$watch(
        () => this.data,
        (data) => {
          if (!data) {
            return;
          }

          renderReact();
        }
      );
    }
  },
});
