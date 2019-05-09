/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import ReactDOM from 'react-dom';
import { unmountComponentAtNode } from 'react-dom';
import chrome from 'ui/chrome';
import { PLUGIN, INTEGRATED_SOLUTIONS } from '../../../../common/constants';
import { UMBreadcrumb } from '../../../breadcrumbs';
import { BootstrapUptimeApp, UMFrameworkAdapter } from '../../lib';
import { CreateGraphQLClient } from './framework_adapter_types';
import { renderUptimeKibanaGlobalHelp } from './kibana_global_help';
import { getIntegratedAppAvailability } from './capabilities_adapter';

export class UMKibanaFrameworkAdapter implements UMFrameworkAdapter {
  private uiRoutes: any;
  private xsrfHeader: string;
  private uriPath: string;

  constructor(uiRoutes: any) {
    this.uiRoutes = uiRoutes;
    this.xsrfHeader = chrome.getXsrfToken();
    this.uriPath = `${chrome.getBasePath()}/api/uptime/graphql`;
  }

  /**
   * This function will acquire all the existing data from Kibana
   * services and persisted state expected by the plugin's props
   * interface. It then renders the plugin.
   */
  public render = (
    renderComponent: BootstrapUptimeApp,
    createGraphQLClient: CreateGraphQLClient
  ) => {
    const route = {
      controllerAs: 'uptime',
      // @ts-ignore angular
      controller: ($scope, $route, config, $location, $window) => {
        const graphQLClient = createGraphQLClient(this.uriPath, this.xsrfHeader);
        $scope.$$postDigest(() => {
          const elem = document.getElementById('uptimeReactRoot');

          // configure breadcrumbs
          let kibanaBreadcrumbs: UMBreadcrumb[] = [];
          chrome.breadcrumbs.get$().subscribe((breadcrumbs: UMBreadcrumb[]) => {
            kibanaBreadcrumbs = breadcrumbs;
          });

          // set up route with current base path
          const basePath = chrome.getBasePath();
          const routerBasename = basePath.endsWith('/')
            ? `${basePath}/${PLUGIN.ROUTER_BASE_NAME}`
            : basePath + PLUGIN.ROUTER_BASE_NAME;

          /**
           * TODO: this is a redirect hack to deal with a problem that largely
           * in testing but rarely occurs in the real world, where the specified
           * URL contains `.../app/uptime{SOME_URL_PARAM_TEXT}#` instead of
           * a path like `.../app/uptime#{SOME_URL_PARAM_TEXT}`.
           *
           * This redirect will almost never be triggered in practice, but it makes more
           * sense to include it here rather than altering the existing testing
           * infrastructure underlying the rest of Kibana.
           *
           * We welcome a more permanent solution that will result in the deletion of the
           * block below.
           */
          if ($location.absUrl().indexOf(PLUGIN.ROUTER_BASE_NAME) === -1) {
            $window.location.replace(routerBasename);
          }

          // determine whether dark mode is enabled
          const darkMode = config.get('theme:darkMode', false) || false;

          /**
           * We pass this global help setup as a prop to the app, because for
           * localization it's necessary to have the provider mounted before
           * we can render our help links, as they rely on i18n.
           */
          const renderGlobalHelpControls = () =>
            // render Uptime feedback link in global help menu
            chrome.helpExtension.set((element: HTMLDivElement) => {
              ReactDOM.render(renderUptimeKibanaGlobalHelp(), element);
              return () => ReactDOM.unmountComponentAtNode(element);
            });

          /**
           * These values will let Uptime know if the integrated solutions
           * are available. If any/all of them are unavaialble, we should not show
           * links/integrations to those apps.
           */
          const {
            apm: isApmAvailable,
            infrastructure: isInfraAvailable,
            logs: isLogsAvailable,
          } = getIntegratedAppAvailability(INTEGRATED_SOLUTIONS);

          ReactDOM.render(
            renderComponent({
              basePath,
              darkMode,
              setBreadcrumbs: chrome.breadcrumbs.set,
              kibanaBreadcrumbs,
              setBadge: chrome.badge.set,
              routerBasename,
              client: graphQLClient,
              renderGlobalHelpControls,
              isApmAvailable,
              isInfraAvailable,
              isLogsAvailable,
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
}
