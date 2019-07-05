/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

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
  private defaultDateRangeStart: string;
  private defaultDateRangeEnd: string;
  private defaultAutorefreshInterval: number;
  private defaultAutorefreshIsPaused: boolean;

  constructor(
    uiRoutes: any,
    dateRangeStart?: string,
    dateRangeEnd?: string,
    autorefreshInterval?: number,
    autorefreshIsPaused?: boolean
  ) {
    this.uiRoutes = uiRoutes;
    this.xsrfHeader = chrome.getXsrfToken();
    this.uriPath = `${chrome.getBasePath()}/api/uptime/graphql`;
    this.defaultDateRangeStart = dateRangeStart || 'now-15m';
    this.defaultDateRangeEnd = dateRangeEnd || 'now';
    this.defaultAutorefreshInterval = autorefreshInterval || 60 * 1000;
    this.defaultAutorefreshIsPaused = autorefreshIsPaused || true;
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
          const darkMode = config.get('theme:darkMode', false) || false;
          const {
            autorefreshIsPaused,
            autorefreshInterval,
            dateRangeStart,
            dateRangeEnd,
          } = persistedState;
          ReactDOM.render(
            renderComponent({
              darkMode,
              isUsingK7Design: $scope.k7design,
              updateBreadcrumbs: chrome.breadcrumbs.set,
              kibanaBreadcrumbs,
              routerBasename,
              graphQLClient,
              initialAutorefreshIsPaused: autorefreshIsPaused,
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

  private initializePersistedState = (): UptimePersistedState => {
    const uptimeConfigurationData = window.localStorage.getItem(PLUGIN.LOCAL_STORAGE_KEY);
    const defaultState: UptimePersistedState = {
      autorefreshIsPaused: this.defaultAutorefreshIsPaused,
      autorefreshInterval: this.defaultAutorefreshInterval,
      dateRangeStart: this.defaultDateRangeStart,
      dateRangeEnd: this.defaultDateRangeEnd,
    };
    try {
      if (uptimeConfigurationData) {
        const parsed = JSON.parse(uptimeConfigurationData) || {};
        const { dateRangeStart, dateRangeEnd } = parsed;
        // TODO: this is defensive code to ensure we don't encounter problems
        // when encountering older versions of the localStorage values.
        // The old code has never been released, so users don't need it, and this
        // code should be removed eventually.
        if (
          (dateRangeEnd && typeof dateRangeEnd === 'number') ||
          (dateRangeStart && typeof dateRangeStart === 'number')
        ) {
          this.updatePersistedState(defaultState);
          return defaultState;
        }
        return parsed;
      }
    } catch (e) {
      // TODO: this should result in a redirect to error page
      throw e;
    }
    this.updatePersistedState(defaultState);
    return defaultState;
  };

  private updatePersistedState = (state: UptimePersistedState) => {
    window.localStorage.setItem(PLUGIN.LOCAL_STORAGE_KEY, JSON.stringify(state));
  };
}
