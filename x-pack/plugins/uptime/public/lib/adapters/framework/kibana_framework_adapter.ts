/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import ReactDOM from 'react-dom';
import { unmountComponentAtNode } from 'react-dom';
import chrome from 'ui/chrome';
import { PLUGIN } from '../../../../common/constants';
import { UMBreadcrumb } from '../../../breadcrumbs';
import { UptimePersistedState } from '../../../uptime_app';
import { BootstrapUptimeApp, UMFrameworkAdapter } from '../../lib';
import { CreateGraphQLClient } from './framework_adapter_types';

export class UMKibanaFrameworkAdapter implements UMFrameworkAdapter {
  private uiRoutes: any;
  private xsrfHeader: string;
  private uriPath: string;

  constructor(uiRoutes: any) {
    this.uiRoutes = uiRoutes;
    this.xsrfHeader = chrome.getXsrfToken();
    this.uriPath = `${chrome.getBasePath()}/api/uptime/graphql`;
  }

  public render = (
    renderComponent: BootstrapUptimeApp,
    createGraphQLClient: CreateGraphQLClient
  ) => {
    const route = {
      controllerAs: 'uptime',
      // @ts-ignore angular
      controller: ($scope, $route, $http, config) => {
        const graphQLClient = createGraphQLClient(this.uriPath, this.xsrfHeader);
        config.bindToScope($scope, 'k7design');
        $scope.$$postDigest(() => {
          const elem = document.getElementById('uptimeReactRoot');
          let kibanaBreadcrumbs: UMBreadcrumb[] = [];
          if ($scope.k7design) {
            chrome.breadcrumbs.get$().subscribe((breadcrumbs: UMBreadcrumb[]) => {
              kibanaBreadcrumbs = breadcrumbs;
            });
          }
          const basePath = chrome.getBasePath();
          const routerBasename = basePath.endsWith('/')
            ? `${basePath}/${PLUGIN.ROUTER_BASE_NAME}`
            : basePath + PLUGIN.ROUTER_BASE_NAME;
          const persistedState = this.initializePersistedState();
          const {
            autorefreshEnabled,
            autorefreshInterval,
            dateRangeStart,
            dateRangeEnd,
          } = persistedState;
          ReactDOM.render(
            renderComponent({
              isUsingK7Design: $scope.k7design,
              updateBreadcrumbs: chrome.breadcrumbs.set,
              kibanaBreadcrumbs,
              routerBasename,
              graphQLClient,
              initialAutorefreshEnabled: autorefreshEnabled,
              initialAutorefreshInterval: autorefreshInterval,
              initialDateRangeStart: dateRangeStart,
              initialDateRangeEnd: dateRangeEnd,
              persistState: this.updatePersistedState,
            }),
            elem
          );
          this.manageAngularLifecycle($scope, $route, elem);
        });
      },
      template:
        '<uptime-app section="kibana" id="uptimeReactRoot" class="app-wrapper-panel"></uptime-app>',
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
      } else {
        const initialState: UptimePersistedState = {
          autorefreshEnabled: false,
          autorefreshInterval: 5000,
          dateRangeStart: moment()
            .subtract(1, 'day')
            .valueOf(),
          dateRangeEnd: moment().valueOf(),
        };
        this.updatePersistedState(initialState);
        return initialState;
      }
    } catch (e) {
      return {};
    }
  };

  private updatePersistedState = (state: UptimePersistedState) => {
    window.localStorage.setItem(PLUGIN.LOCAL_STORAGE_KEY, JSON.stringify(state));
  };
}
