/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { uiRoutes } from '../../../angular/helpers/routes';
import { routeInitProvider } from '../../../lib/route_init';
import { MonitoringViewBaseEuiTableController } from '../../';
import { getPageData } from './get_page_data';
import template from './index.html';
import { KibanaInstances } from '../../../components/kibana/instances';
import { SetupModeRenderer } from '../../../components/renderers';
import { SetupModeContext } from '../../../components/setup_mode/setup_mode_context';
import {
  KIBANA_SYSTEM_ID,
  CODE_PATH_KIBANA,
  ALERT_KIBANA_VERSION_MISMATCH,
  ALERT_MISSING_MONITORING_DATA,
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
        title: i18n.translate('xpack.monitoring.kibana.instances.routeTitle', {
          defaultMessage: 'Kibana - Instances',
        }),
        pageTitle: i18n.translate('xpack.monitoring.kibana.instances.pageTitle', {
          defaultMessage: 'Kibana instances',
        }),
        storageKey: 'kibana.instances',
        getPageData,
        reactNodeId: 'monitoringKibanaInstancesApp',
        $scope,
        $injector,
        alerts: {
          shouldFetch: true,
          options: {
            alertTypeIds: [ALERT_KIBANA_VERSION_MISMATCH, ALERT_MISSING_MONITORING_DATA],
            filters: [
              {
                stackProduct: KIBANA_SYSTEM_ID,
              },
            ],
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
              <SetupModeContext.Provider value={{ setupModeSupported: true }}>
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
              </SetupModeContext.Provider>
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
