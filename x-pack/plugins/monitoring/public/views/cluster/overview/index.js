/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import uiRoutes from 'ui/routes';
import { routeInitProvider } from 'plugins/monitoring/lib/route_init';
import template from './index.html';
import { MonitoringViewBaseController } from '../../';
import { Overview } from 'plugins/monitoring/components/cluster/overview';
import { I18nContext } from 'ui/i18n';

uiRoutes.when('/overview', {
  template,
  resolve: {
    clusters(Private) {
      // checks license info of all monitored clusters for multi-cluster monitoring usage and capability
      const routeInit = Private(routeInitProvider);
      return routeInit();
    },
    cluster(monitoringClusters, globalState) {
      return monitoringClusters(globalState.cluster_uuid, globalState.ccs);
    },
    // clusterCapabilities(capabilities, globalState) {
    //   return capabilities(globalState.cluster_uuid, globalState.ccs);
    // },
    clusterMonitoringHosts(monitoringHosts) {
      return monitoringHosts();
    }
  },
  controller: class extends MonitoringViewBaseController {
    constructor($injector, $scope, i18n, clusterMonitoringHosts) {
      const kbnUrl = $injector.get('kbnUrl');
      const monitoringClusters = $injector.get('monitoringClusters');
      const capabilities = $injector.get('capabilities');
      const globalState = $injector.get('globalState');

      // While the flyout is active (and the user is going through migration steps),
      // do not refetch this data automatically. Instead, require the user to click
      // the button to check for new data
      let isCapabilitiesFetchingPaused = false;
      let lastCapabilities = null;

      super({
        title: i18n('xpack.monitoring.cluster.overviewTitle', {
          defaultMessage: 'Overview'
        }),
        defaultData: {},
        getPageData: async () => {
          const cluster = await monitoringClusters(globalState.cluster_uuid, globalState.ccs);
          const clusterCapabilities = isCapabilitiesFetchingPaused
            ? lastCapabilities
            : await capabilities(globalState.cluster_uuid, globalState.ccs);

          lastCapabilities = clusterCapabilities;

          return {
            ...cluster,
            clusterCapabilities
          };
        },
        reactNodeId: 'monitoringClusterOverviewApp',
        $scope,
        $injector
      });

      const changeUrl = target => {
        $scope.$evalAsync(() => {
          kbnUrl.changePath(target);
        });
      };

      $scope.$watch(() => this.data, data => {
        if (!data) {
          return null;
        }

        this.renderReact(
          <I18nContext>
            <Overview
              cluster={data}
              clusterCapabilities={data.clusterCapabilities}
              monitoringHosts={clusterMonitoringHosts}
              changeUrl={changeUrl}
              updateData={this.updateData}
              fetchCapabilities={async () => await capabilities(globalState.cluster_uuid, globalState.ccs)}
              setCapabilitiesFetchingPaused={value => isCapabilitiesFetchingPaused = value}
              showLicenseExpiration={true}
            />
          </I18nContext>
        );
      });
    }
  }
});
