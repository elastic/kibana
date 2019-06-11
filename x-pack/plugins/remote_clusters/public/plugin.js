/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { unmountComponentAtNode } from 'react-dom';
import { i18n } from '@kbn/i18n';

import template from './index.html';
import { renderReact } from './app';
import { CRUD_APP_BASE_PATH } from './app/constants';
import { setUserHasLeftApp, setRedirect } from './app/services';
import { init as initBreadcrumbs } from './app/services/breadcrumb';
import { init as initDocumentation } from './app/services/documentation';
import { init as initHttp } from './app/services/http';
import { init as initUiMetric } from './app/services/ui_metric';
import { init as initNotification } from './app/services/notification';

const REACT_ROOT_ID = 'remoteClustersReactRoot';

export class Plugin {
  start(core, plugins) {
    if (core.chrome.getInjected('remoteClustersUiEnabled')) {
      const {
        i18n: {
          Context,
        },
        routing: {
          registerAngularRoute,
        },
        chrome,
        notification: {
          toastNotifications,
          fatalError,
        },
        documentation: {
          esPluginDocBasePath,
          esDocBasePath,
        },
      } = core;

      const {
        management: {
          constants: {
            BREADCRUMB,
          },
        },
        uiMetric: {
          track,
        },
      } = plugins;

      const esSection = plugins.management.sections.getSection('elasticsearch');
      esSection.register('remote_clusters', {
        visible: true,
        display: i18n.translate('xpack.remoteClusters.appTitle', { defaultMessage: 'Remote Clusters' }),
        order: 5,
        url: `#${CRUD_APP_BASE_PATH}/list`,
      });

      // Initialize services
      initBreadcrumbs(chrome, BREADCRUMB, i18n);
      initDocumentation(esDocBasePath, esPluginDocBasePath);
      initUiMetric(track);
      initNotification(toastNotifications, fatalError);

      const unmountReactApp = () => {
        const appElement = document.getElementById(REACT_ROOT_ID);
        if (appElement) {
          unmountComponentAtNode(appElement);
        }
      };

      registerAngularRoute(`${CRUD_APP_BASE_PATH}/:view?/:id?`, {
        template,
        controllerAs: 'remoteClusters',
        controller: class RemoteClustersController {
          constructor($scope, $route, $http, kbnUrl) {
            // NOTE: We depend upon Angular's $http service because it's decorated with interceptors,
            // e.g. to check license status per request.
            initHttp($http, chrome);

            setRedirect((path) => {
              $scope.$evalAsync(() => {
                kbnUrl.redirect(path);
              });
            });

            // If returning to the app, we'll need to reset this state.
            setUserHasLeftApp(false);

            // React-router's <Redirect> will cause this controller to re-execute without the $destroy
            // handler being called. This means the app will re-mount, so we need to unmount it first
            // here.
            unmountReactApp();

            $scope.$$postDigest(() => {
              const appElement = document.getElementById(REACT_ROOT_ID);
              if (appElement) {
                renderReact(appElement, Context);
              }

              const appRoute = $route.current;
              const stopListeningForLocationChange = $scope.$on('$locationChangeSuccess', () => {
                const currentRoute = $route.current;
                const isNavigationInApp = currentRoute.$$route.template === appRoute.$$route.template;

                // When we navigate within the app, prevent Angular from re-matching the route and
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
                unmountReactApp();
              });
            });
          }
        }
      });
    }
  }
}
