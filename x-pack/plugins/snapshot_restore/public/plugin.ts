/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { PLUGIN } from '../common/constants';
import { renderReact } from './app';
import template from './index.html';
import { createShim } from './shim';

const REACT_ROOT_ID = 'snapshotRestoreReactRoot';

export class Plugin {
  public start(): void {
    const {
      core: { i18n, routes, http },
      plugins: { management },
    } = createShim();

    // Register management section
    const esSection = management.getSection('elasticsearch');
    esSection.register(PLUGIN.ID, {
      visible: true,
      display: i18n.translate('xpack.snapshotRestore.appName', {
        defaultMessage: 'Snapshot and Restore',
      }),
      order: 7,
      url: `#${PLUGIN.CLIENT_BASE_PATH}/repositories`,
    });

    // Register react root
    routes.when(`${PLUGIN.CLIENT_BASE_PATH}/:section?/:subsection?/:view?/:id`, {
      template,
      controller: ($scope, $route, $http, $q) => {
        let elem;

        // React-router's <Redirect> does not play well with the angular router. It will cause this controller
        // to re-execute without the $destroy handler being called. This means that the app will be mounted twice
        // creating a memory leak when leaving (only 1 app will be unmounted).
        // To avoid this, we unmount the React app each time we enter the controller.
        routes.unmountReactApp(elem);

        // NOTE: We depend upon Angular's $http service because it's decorated with interceptors,
        // e.g. to check license status per request.
        http.setClient($http, $q);

        $scope.$$postDigest(() => {
          elem = document.getElementById(REACT_ROOT_ID);
          renderReact(elem, i18n.Context);

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
              routes.unmountReactApp(elem);
            });
          });
        });
      },
    });
  }
}
