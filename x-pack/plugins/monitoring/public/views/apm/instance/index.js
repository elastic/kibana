/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { find, get } from 'lodash';
import uiRoutes from'ui/routes';
import { routeInitProvider } from 'plugins/monitoring/lib/route_init';
import template from './index.html';
import { MonitoringViewBaseController } from '../../base_controller';
import { ApmServerInstance } from '../../../components/apm/instance';

uiRoutes.when('/apm/instances/:uuid', {
  template,
  resolve: {
    clusters: function (Private) {
      const routeInit = Private(routeInitProvider);
      return routeInit();
    },
  },

  controller: class extends MonitoringViewBaseController {
    constructor($injector, $scope) {
      const $route = $injector.get('$route');
      const title = $injector.get('title');
      const globalState = $injector.get('globalState');
      $scope.cluster = find($route.current.locals.clusters, {
        cluster_uuid: globalState.cluster_uuid
      });

      super({
        title: `APM - Instance`,
        api: `../api/monitoring/v1/clusters/${globalState.cluster_uuid}/apm/${$route.current.params.uuid}`,
        defaultData: {},
        reactNodeId: 'apmInstanceReact',
        $scope,
        $injector
      });

      $scope.$watch(() => this.data, data => {
        title($scope.cluster, `APM - ${get(data, 'apmSummary.name')}`);
        this.renderReact(data);
      });
    }

    renderReact(data) {
      const component = (
        <ApmServerInstance
          summary={data.apmSummary || {}}
          metrics={data.metrics || {}}
        />
      );
      super.renderReact(component);
    }
  }
});
