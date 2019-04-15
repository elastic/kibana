/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import uiRoutes from'ui/routes';
import { routeInitProvider } from 'plugins/monitoring/lib/route_init';
import { MonitoringViewBaseEuiTableController } from '../../';
import { getPageData } from './get_page_data';
import template from './index.html';
import { KibanaInstances } from 'plugins/monitoring/components/kibana/instances';
import { SetupModeRenderer } from '../../../components/renderers';

uiRoutes.when('/kibana/instances', {
  template,
  resolve: {
    clusters(Private) {
      const routeInit = Private(routeInitProvider);
      return routeInit();
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
        $injector
      });

      const kbnUrl = $injector.get('kbnUrl');

      const renderReact = () => {
        this.renderReact(
          <SetupModeRenderer
            scope={$scope}
            injector={$injector}
            productName="kibana"
            render={({ setupMode, flyoutComponent }) => (
              <Fragment>
                {flyoutComponent}
                <KibanaInstances
                  instances={this.data.kibanas}
                  setupMode={setupMode}
                  productUuidField="kibana.uuid"
                  clusterStatus={this.data.clusterStatus}
                  angular={{
                    $scope,
                    kbnUrl,
                  }}
                />
              </Fragment>
            )}
          />
        );
      };

      $scope.$watch(() => this.data, data => {
        if (!data) {
          return;
        }

        renderReact();
      });
    }
  }
});
