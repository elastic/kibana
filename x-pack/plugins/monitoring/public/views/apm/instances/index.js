/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { find } from 'lodash';
import uiRoutes from'ui/routes';
import { routeInitProvider } from 'plugins/monitoring/lib/route_init';
import template from './index.html';
import { ApmServerInstances } from '../../../components/apm/instances';
import { MonitoringViewBaseTableController } from '../../base_table_controller';
import { I18nProvider } from '@kbn/i18n/react';

uiRoutes.when('/apm/instances', {
  template,
  resolve: {
    clusters: function (Private) {
      const routeInit = Private(routeInitProvider);
      return routeInit();
    },
  },
  controller: class extends MonitoringViewBaseTableController {
    constructor($injector, $scope, i18n) {
      const $route = $injector.get('$route');
      const globalState = $injector.get('globalState');
      $scope.cluster = find($route.current.locals.clusters, {
        cluster_uuid: globalState.cluster_uuid
      });

      super({
        title: i18n('xpack.monitoring.apm.instances.routeTitle', {
          defaultMessage: '{apm} - Instances',
          values: {
            apm: 'APM'
          }
        }),
        storageKey: 'apm.instances',
        api: `../api/monitoring/v1/clusters/${globalState.cluster_uuid}/apm/instances`,
        defaultData: {},
        reactNodeId: 'apmInstancesReact',
        $scope,
        $injector
      });

      $scope.$watch(() => this.data, data => {
        this.renderReact(data);
      });
    }

    renderReact(data) {
      const {
        pageIndex,
        filterText,
        sortKey,
        sortOrder,
        onNewState,
      } = this;

      const component = (
        <I18nProvider>
          <ApmServerInstances
            apms={{
              pageIndex,
              filterText,
              sortKey,
              sortOrder,
              onNewState,
              data,
            }}
          />
        </I18nProvider>
      );
      super.renderReact(component);
    }
  }
});
