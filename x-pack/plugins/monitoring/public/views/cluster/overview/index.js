/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { isEmpty } from 'lodash';
import { i18n } from '@kbn/i18n';
import { uiRoutes } from '../../../angular/helpers/routes';
import { routeInitProvider } from '../../../lib/route_init';
import template from './index.html';
import { MonitoringViewBaseController } from '../../';
import { Overview } from '../../../components/cluster/overview';
import { SetupModeRenderer } from '../../../components/renderers';
import { SetupModeContext } from '../../../components/setup_mode/setup_mode_context';
import { CODE_PATH_ALL } from '../../../../common/constants';
import { EnableAlertsModal } from '../../../alerts/enable_alerts_modal.tsx';

const CODE_PATHS = [CODE_PATH_ALL];

uiRoutes.when('/overview', {
  template,
  resolve: {
    clusters(Private) {
      // checks license info of all monitored clusters for multi-cluster monitoring usage and capability
      const routeInit = Private(routeInitProvider);
      return routeInit({ codePaths: CODE_PATHS });
    },
  },
  controllerAs: 'monitoringClusterOverview',
  controller: class extends MonitoringViewBaseController {
    constructor($injector, $scope) {
      const monitoringClusters = $injector.get('monitoringClusters');
      const globalState = $injector.get('globalState');
      const showLicenseExpiration = $injector.get('showLicenseExpiration');

      super({
        title: i18n.translate('xpack.monitoring.cluster.overviewTitle', {
          defaultMessage: 'Overview',
        }),
        pageTitle: i18n.translate('xpack.monitoring.cluster.overview.pageTitle', {
          defaultMessage: 'Cluster overview',
        }),
        defaultData: {},
        getPageData: async () => {
          const clusters = await monitoringClusters(
            globalState.cluster_uuid,
            globalState.ccs,
            CODE_PATHS
          );
          return clusters[0];
        },
        reactNodeId: 'monitoringClusterOverviewApp',
        $scope,
        $injector,
        alerts: {
          shouldFetch: true,
        },
        telemetryPageViewTitle: 'cluster_overview',
      });

      this.init = () => this.renderReact(null);

      $scope.$watch(
        () => this.data,
        async (data) => {
          if (isEmpty(data)) {
            return;
          }

          this.renderReact(
            <SetupModeRenderer
              scope={$scope}
              injector={$injector}
              render={({ setupMode, flyoutComponent, bottomBarComponent }) => (
                <SetupModeContext.Provider value={{ setupModeSupported: true }}>
                  {flyoutComponent}
                  <Overview
                    cluster={data}
                    alerts={this.alerts}
                    setupMode={setupMode}
                    showLicenseExpiration={showLicenseExpiration}
                  />
                  <EnableAlertsModal />
                  {bottomBarComponent}
                </SetupModeContext.Provider>
              )}
            />
          );
        }
      );
    }
  },
});
