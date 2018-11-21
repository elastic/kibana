/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import ReactDOM from 'react-dom';
import { unmountComponentAtNode } from 'react-dom';
import { UMFrameworkAdapter } from '../../lib';

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
          this.manageAngularLifecycle($scope, $route, elem);
        });
      },
      template:
        '<uptime-monitoring-app section="kibana" class="ng-scope"><div id="uptimeMonitoringReactRoot"></div></uptime-monitoring-app>',
    });
  };

  // @ts-ignore angular params
  private manageAngularLifecycle = ($scope, $route, elem) => {
    const lastRoute = $route.current;
    const deregister = $scope.$on('$locationChangeSuccess', () => {
      const currentRoute = $route.current;
      if (lastRoute.$$route.template === currentRoute.$$route.template) {
        $route.current = lastRoute;
      }
    });
    $scope.$on('$destroy', () => {
      deregister();
      unmountComponentAtNode(elem);
    });
  };
}
