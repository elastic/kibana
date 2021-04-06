/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { uiRoutes } from '../../../angular/helpers/routes';
import { routeInitProvider } from '../../../lib/route_init';
import { MonitoringViewBaseEuiTableController } from '../../';
import { getPageData } from './get_page_data';
import template from './index.html';
import { Listing } from '../../../components/logstash/listing';
import { SetupModeRenderer } from '../../../components/renderers';
import { SetupModeContext } from '../../../components/setup_mode/setup_mode_context';
import {
  CODE_PATH_LOGSTASH,
  LOGSTASH_SYSTEM_ID,
  ALERT_LOGSTASH_VERSION_MISMATCH,
} from '../../../../common/constants';

uiRoutes.when('/logstash/nodes', {
  template,
  resolve: {
    clusters(Private) {
      const routeInit = Private(routeInitProvider);
      return routeInit({ codePaths: [CODE_PATH_LOGSTASH] });
    },
    pageData: getPageData,
  },
  controllerAs: 'lsNodes',
  controller: class LsNodesList extends MonitoringViewBaseEuiTableController {
    constructor($injector, $scope) {
      super({
        title: i18n.translate('xpack.monitoring.logstash.nodes.routeTitle', {
          defaultMessage: 'Logstash - Nodes',
        }),
        pageTitle: i18n.translate('xpack.monitoring.logstash.nodes.pageTitle', {
          defaultMessage: 'Logstash nodes',
        }),
        storageKey: 'logstash.nodes',
        getPageData,
        reactNodeId: 'monitoringLogstashNodesApp',
        $scope,
        $injector,
        alerts: {
          shouldFetch: true,
          options: {
            alertTypeIds: [ALERT_LOGSTASH_VERSION_MISMATCH],
          },
        },
      });

      const renderComponent = () => {
        this.renderReact(
          <SetupModeRenderer
            scope={$scope}
            injector={$injector}
            productName={LOGSTASH_SYSTEM_ID}
            render={({ setupMode, flyoutComponent, bottomBarComponent }) => (
              <SetupModeContext.Provider value={{ setupModeSupported: true }}>
                {flyoutComponent}
                <Listing
                  data={this.data.nodes}
                  setupMode={setupMode}
                  stats={this.data.clusterStatus}
                  alerts={this.alerts}
                  sorting={this.sorting}
                  pagination={this.pagination}
                  onTableChange={this.onTableChange}
                />
                {bottomBarComponent}
              </SetupModeContext.Provider>
            )}
          />
        );
      };

      this.onTableChangeRender = renderComponent;

      $scope.$watch(
        () => this.data,
        () => renderComponent()
      );
    }
  },
});
