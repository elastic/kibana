/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { unmountComponentAtNode } from 'react-dom';

import { PLUGIN } from '../common/constants';
import { CLIENT_BASE_PATH, renderReact } from './app';
import { AppCore, AppPlugins } from './app/types';
import template from './index.html';
import { Core, Plugins } from './shim';

import { breadcrumbService } from './app/services/navigation';
import { documentationLinksService } from './app/services/documentation';
import { httpService } from './app/services/http';
import { textService } from './app/services/text';
import { uiMetricService } from './app/services/ui_metric';

const REACT_ROOT_ID = 'snapshotRestoreReactRoot';

export class Plugin {
  public start(core: Core, plugins: Plugins): void {
    const { i18n, routing, http, chrome, notification, documentation } = core;
    const { management, uiMetric } = plugins;

    // Register management section
    const esSection = management.sections.getSection('elasticsearch');
    esSection.register(PLUGIN.ID, {
      visible: true,
      display: i18n.translate('xpack.snapshotRestore.appName', {
        defaultMessage: 'Snapshot Repositories',
      }),
      order: 7,
      url: `#${CLIENT_BASE_PATH}`,
    });

    // Initialize services
    textService.init(i18n);
    breadcrumbService.init(chrome, management.constants.BREADCRUMB);
    documentationLinksService.init(documentation.esDocBasePath, documentation.esPluginDocBasePath);
    uiMetricService.init(uiMetric.track);

    const unmountReactApp = (): void => {
      const elem = document.getElementById(REACT_ROOT_ID);
      if (elem) {
        unmountComponentAtNode(elem);
      }
    };

    // Register react root
    routing.registerAngularRoute(`${CLIENT_BASE_PATH}/:section?/:subsection?/:view?/:id?`, {
      template,
      controllerAs: 'snapshotRestoreController',
      controller: ($scope: any, $route: any, $http: ng.IHttpService, $q: any) => {
        // NOTE: We depend upon Angular's $http service because it's decorated with interceptors,
        // e.g. to check license status per request.
        http.setClient($http);
        httpService.init(http.getClient(), chrome);

        // Angular Lifecycle
        const appRoute = $route.current;
        const stopListeningForLocationChange = $scope.$on('$locationChangeSuccess', () => {
          const currentRoute = $route.current;
          const isNavigationInApp = currentRoute.$$route.template === appRoute.$$route.template;

          // When we navigate within SR, prevent Angular from re-matching the route and rebuild the app
          if (isNavigationInApp) {
            $route.current = appRoute;
          } else {
            // Any clean up when user leaves SR
          }

          $scope.$on('$destroy', () => {
            if (stopListeningForLocationChange) {
              stopListeningForLocationChange();
            }
            unmountReactApp();
          });
        });

        $scope.$$postDigest(() => {
          unmountReactApp();
          const elem = document.getElementById(REACT_ROOT_ID);
          if (elem) {
            renderReact(
              elem,
              { i18n, notification } as AppCore,
              { management: { sections: management.sections } } as AppPlugins
            );
          }
        });
      },
    });
  }
}
