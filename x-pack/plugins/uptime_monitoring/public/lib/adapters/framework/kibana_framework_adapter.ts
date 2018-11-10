/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import ReactDOM from 'react-dom';
import { UMFrameworkAdapter } from '../../lib';
import { manageAngularLifecycle } from '../../manage_angular_lifecycle';

export class UMKibanaFrameworkAdapter implements UMFrameworkAdapter {
  private uiRoutes: any;

  constructor(uiRoutes: any) {
    this.uiRoutes = uiRoutes;
  }

  public render = (component: React.ReactElement<any>) => {
    this.register(component);
  };

  private register = (rootComponent: React.ReactElement<any>) => {
    this.uiRoutes.enable();
    this.uiRoutes.when('/home', {
      controllerAs: 'uptime',
      // @ts-ignore angular
      controller: ($scope, $route, $http) => {
        $scope.$$postDigest(() => {
          const elem = document.getElementById('uptimeMonitoringReactRoot');
          ReactDOM.render(rootComponent, elem);
          manageAngularLifecycle($scope, $route, elem);
        });
      },
      template:
        '<uptime-monitoring-app section="kibana" class="ng-scope"><div id="uptimeMonitoringReactRoot"></div></uptime-monitoring-app>',
    });
  };
}
