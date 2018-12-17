/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { NormalizedCacheObject } from 'apollo-cache-inmemory';
import ApolloClient from 'apollo-client';
import ReactDOM from 'react-dom';
import { unmountComponentAtNode } from 'react-dom';
import chrome, { Breadcrumb } from 'ui/chrome';
import { PLUGIN } from '../../../../common/constants';
import { UptimePersistedState } from '../../../uptime_monitoring_app';
import { BootstrapUptimeApp, UMFrameworkAdapter } from '../../lib';

export class UMKibanaFrameworkAdapter implements UMFrameworkAdapter {
  private uiRoutes: any;

  constructor(uiRoutes: any) {
    this.uiRoutes = uiRoutes;
  }

  public render = (
    component: BootstrapUptimeApp,
    graphQLClient: ApolloClient<NormalizedCacheObject>
  ) => {
    const route = {
      controllerAs: 'uptime',
      // @ts-ignore angular
      controller: ($scope, $route, $http, config) => {
        config.bindToScope($scope, 'k7design');
        $scope.$$postDigest(() => {
          const elem = document.getElementById('uptimeMonitoringReactRoot');
          let kibanaBreadcrumbs: Breadcrumb[] = [];
          if ($scope.k7design) {
            chrome.breadcrumbs.get$().subscribe((breadcrumbs: Breadcrumb[]) => {
              kibanaBreadcrumbs = breadcrumbs;
            });
          }
          const basePath = chrome.getBasePath();
          const routerBasename = basePath.endsWith('/')
            ? `${basePath}/${PLUGIN.ROUTER_BASE_NAME}`
            : basePath + PLUGIN.ROUTER_BASE_NAME;
          const { autorefreshEnabled, autorefreshInterval } = this.initializePersistedState();
          ReactDOM.render(
            component({
              isUsingK7Design: $scope.k7design,
              updateBreadcrumbs: chrome.breadcrumbs.set,
              kibanaBreadcrumbs,
              routerBasename,
              graphQLClient,
              initialAutorefreshEnabled: autorefreshEnabled,
              initialAutorefreshInterval: autorefreshInterval,
              persistState: this.updatePersistedState,
            }),
            elem
          );
          this.manageAngularLifecycle($scope, $route, elem);
        });
      },
      template:
        '<uptime-monitoring-app section="kibana" id="uptimeMonitoringReactRoot" class="app-wrapper-panel"></uptime-monitoring-app>',
    };
    this.uiRoutes.enable();
    // TODO: hack to refer all routes to same endpoint, use a more proper way of achieving this
    this.uiRoutes.otherwise(route);
  };

  // @ts-ignore angular params
  private manageAngularLifecycle = ($scope, $route, elem) => {
    const lastRoute = $route.current;
    const deregister = $scope.$on('$locationChangeSuccess', () => {
      const currentRoute = $route.current;
      if (lastRoute.$$route && lastRoute.$$route.template === currentRoute.$$route.template) {
        $route.current = lastRoute;
      }
    });
    $scope.$on('$destroy', () => {
      deregister();
      unmountComponentAtNode(elem);
    });
  };

  private initializePersistedState = () => {
    const uptimeConfigurationData = window.localStorage.getItem(PLUGIN.LOCAL_STORAGE_KEY);
    try {
      if (uptimeConfigurationData) {
        return JSON.parse(uptimeConfigurationData) || {};
      }
    } catch (e) {
      return {};
    }
  };

  private updatePersistedState = (state: UptimePersistedState) => {
    window.localStorage.setItem(PLUGIN.LOCAL_STORAGE_KEY, JSON.stringify(state));
  };
}
