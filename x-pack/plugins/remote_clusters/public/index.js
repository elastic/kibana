/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { unmountComponentAtNode } from 'react-dom';
import { i18n } from '@kbn/i18n';
import { management } from 'ui/management';
import routes from 'ui/routes';
import chrome from 'ui/chrome';

import template from './main.html';
import { renderReact } from './app';
import { CRUD_APP_BASE_PATH } from './app/constants';
import { setHttpClient, setUserHasLeftApp, setRedirect } from './app/services';

if (chrome.getInjected('remoteClustersUiEnabled')) {
  const esSection = management.getSection('elasticsearch');

  esSection.register('remote_clusters', {
    visible: true,
    display: i18n.translate('xpack.remoteClusters.appTitle', { defaultMessage: 'Remote Clusters' }),
    order: 5,
    url: `#${CRUD_APP_BASE_PATH}/list`,
  });

  let appElement;

  routes.when(`${CRUD_APP_BASE_PATH}/:view?/:id?`, {
    template: template,
    controllerAs: 'remoteClusters',
    controller: class RemoteClustersController {
      constructor($scope, $route, $http, kbnUrl) {
        if (appElement) {
          // React-router's <Redirect> will cause this controller to re-execute without the $destroy
          // handler being called. This means the app will re-mount, so we need to unmount it first
          // here.
          unmountComponentAtNode(appElement);
        }

        // NOTE: We depend upon Angular's $http service because it's decorated with interceptors,
        // e.g. to check license status per request.
        setHttpClient($http);

        setRedirect((path) => {
          $scope.$evalAsync(() => {
            kbnUrl.redirect(path);
          });
        });

        // If returning to the app, we'll need to reset this state.
        setUserHasLeftApp(false);

        $scope.$$postDigest(() => {
          appElement = document.getElementById('remoteClustersReactRoot');
          if (appElement) {
            renderReact(appElement);
          }

          const appRoute = $route.current;
          const stopListeningForLocationChange = $scope.$on('$locationChangeSuccess', () => {
            const currentRoute = $route.current;
            const isNavigationInApp = currentRoute.$$route.template === appRoute.$$route.template;

            // When we navigate within rollups, prevent Angular from re-matching the route and
            // rebuilding the app.
            if (isNavigationInApp) {
              $route.current = appRoute;
            } else {
              // Set internal flag so we can prevent reacting to the route change internally.
              setUserHasLeftApp(true);
            }
          });

          $scope.$on('$destroy', () => {
            stopListeningForLocationChange();
            unmountComponentAtNode(appElement);
          });
        });
      }
    }
  });
}
