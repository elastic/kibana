/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import moment from 'moment';
import { find } from 'lodash';
import uiRoutes from'ui/routes';
import { routeInitProvider } from 'plugins/monitoring/lib/route_init';
import template from './index.html';
import { MonitoringViewBaseController } from '../../base_controller';
import { ApmOverview } from '../../../components/apm/overview';
import { timefilter } from 'ui/timefilter';

uiRoutes.when('/apm', {
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
      const globalState = $injector.get('globalState');
      $scope.cluster = find($route.current.locals.clusters, {
        cluster_uuid: globalState.cluster_uuid
      });

      super({
        title: 'APM',
        api: `../api/monitoring/v1/clusters/${globalState.cluster_uuid}/apm`,
        defaultData: {},
        reactNodeId: 'apmOverviewReact',
        $scope,
        $injector
      });

      function onBrush({ xaxis }) {
        timefilter.setTime({
          from: moment(xaxis.from),
          to: moment(xaxis.to),
          mode: 'absolute',
        });
      }

      $scope.$watch(() => this.data, data => {
        this.renderReact(data, onBrush);
      });
    }

    renderReact(data, onBrush) {
      const component = (
        <ApmOverview
          {...data}
          onBrush={onBrush}
        />
      );
      super.renderReact(component);
    }
  }
});
