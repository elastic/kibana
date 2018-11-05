/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import ReactDOM from 'react-dom';
import { HeartbeatFrameworkAdapter } from '../../lib';

export class HeartbeatKibanaFrameworkAdapter implements HeartbeatFrameworkAdapter {
  private uiRoutes: any;

  constructor(uiRoutes: any) {
    this.uiRoutes = uiRoutes;
  }

  public render = (component: React.ReactElement<any>) => {
    this.register(this.uiRoutes, component);
  };

  private register = (uiRoutes: any, rootComponent: React.ReactElement<any>) => {
    uiRoutes.enable();
    uiRoutes.when('/home', {
      controllerAs: 'uptime',
      controller: () => {
        const elem = document.getElementById('uptimeMonitoringReactRoot');
        ReactDOM.render(rootComponent, elem);
      },
      template:
        '<uptime-monitoring-app section="kibana" class="ng-scope"><div id="uptimeMonitoringReactRoot"></div></uptime-monitoring-app>',
    });
  };
}
