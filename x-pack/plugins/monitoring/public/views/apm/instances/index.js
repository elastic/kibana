/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { i18n } from '@kbn/i18n';
import { find } from 'lodash';
import { uiRoutes } from '../../../angular/helpers/routes';
import { routeInitProvider } from '../../../lib/route_init';
import template from './index.html';
import { ApmServerInstances } from '../../../components/apm/instances';
import { MonitoringViewBaseEuiTableController } from '../..';
import { SetupModeRenderer } from '../../../components/renderers';
import { APM_SYSTEM_ID, CODE_PATH_APM } from '../../../../common/constants';

uiRoutes.when('/apm/instances', {
  template,
  resolve: {
    clusters: function (Private) {
      const routeInit = Private(routeInitProvider);
      return routeInit({ codePaths: [CODE_PATH_APM] });
    },
  },
  controller: class extends MonitoringViewBaseEuiTableController {
    constructor($injector, $scope) {
      const $route = $injector.get('$route');
      const globalState = $injector.get('globalState');
      $scope.cluster = find($route.current.locals.clusters, {
        cluster_uuid: globalState.cluster_uuid,
      });

      super({
        title: i18n.translate('xpack.monitoring.apm.instances.routeTitle', {
          defaultMessage: '{apm} - Instances',
          values: {
            apm: 'APM',
          },
        }),
        storageKey: 'apm.instances',
        api: `../api/monitoring/v1/clusters/${globalState.cluster_uuid}/apm/instances`,
        defaultData: {},
        reactNodeId: 'apmInstancesReact',
        $scope,
        $injector,
      });

      this.scope = $scope;
      this.injector = $injector;

      $scope.$watch(
        () => this.data,
        (data) => {
          this.renderReact(data);
        }
      );
    }

    renderReact(data) {
      const { pagination, sorting, onTableChange } = this;

      const component = (
        <SetupModeRenderer
          scope={this.scope}
          injector={this.injector}
          productName={APM_SYSTEM_ID}
          render={({ setupMode, flyoutComponent, bottomBarComponent }) => (
            <Fragment>
              {flyoutComponent}
              <ApmServerInstances
                setupMode={setupMode}
                apms={{
                  pagination,
                  sorting,
                  onTableChange,
                  data,
                }}
              />
              {bottomBarComponent}
            </Fragment>
          )}
        />
      );
      super.renderReact(component);
    }
  },
});
