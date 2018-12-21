/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import routes from 'ui/routes';
import { unmountComponentAtNode } from 'react-dom';
import chrome from 'ui/chrome';

import template from './main.html';
import { BASE_PATH } from '../common/constants/base_path';
import { renderReact } from './app';
import { setHttpClient } from './app/services/api';

if (chrome.getInjected('ccrUiEnabled')) {
  let elem;

  const CCR_REACT_ROOT = 'ccrReactRoot';

  const unmountReactApp = () => elem && unmountComponentAtNode(elem);

  routes.when(`${BASE_PATH}/:section?/:view?/:id?`, {
    template: template,
    controllerAs: 'ccr',
    controller: class CrossClusterReplicationController {
      constructor($scope, $route, $http) {
        /**
         * React-router's <Redirect> does not play wall with the angular router. It will cause this controller
         * to re-execute without the $destroy handler being called. This means that the app will be mounted twice
         * creating a memory leak when leaving (only 1 app will be unmounted).
         * To avoid this, we unmount the React app each time we enter the controller.
         */
        unmountReactApp();

        // NOTE: We depend upon Angular's $http service because it's decorated with interceptors,
        // e.g. to check license status per request.
        setHttpClient($http);

        $scope.$$postDigest(() => {
          elem = document.getElementById(CCR_REACT_ROOT);
          renderReact(elem);

          // Angular Lifecycle
          const appRoute = $route.current;
          const stopListeningForLocationChange = $scope.$on('$locationChangeSuccess', () => {
            const currentRoute = $route.current;
            const isNavigationInApp = currentRoute.$$route.template === appRoute.$$route.template;

            // When we navigate within CCR, prevent Angular from re-matching the route and rebuild the app
            if (isNavigationInApp) {
              $route.current = appRoute;
            } else {
              // Any clean up when User leaves the CCR
            }

            $scope.$on('$destroy', () => {
              stopListeningForLocationChange && stopListeningForLocationChange();
              unmountReactApp();
            });
          });
        });
      }
    }
  });
}
