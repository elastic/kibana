/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { unmountComponentAtNode } from 'react-dom';
import { i18n } from '@kbn/i18n';
import routes from 'ui/routes';

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
  start(coreStart, pluginsStart) {
    const {
      i18n: { Context },
      chrome: { setBreadcrumbs },
      notifications: { toasts },
      fatalError,
      http: { prependBasePath },
      injectedMetadata: { getInjectedVar },
      documentation: { elasticWebsiteUrl, docLinkVersion },
    } = coreStart;

    if (getInjectedVar('remoteClustersUiEnabled')) {
      const {
        management: { getSection, breadcrumb: managementBreadcrumb },
        uiMetric: { track },
      } = pluginsStart;

      const esSection = getSection('elasticsearch');
      esSection.register('remote_clusters', {
        visible: true,
        display: i18n.translate('xpack.remoteClusters.appTitle', { defaultMessage: 'Remote Clusters' }),
        order: 5,
        url: `#${CRUD_APP_BASE_PATH}/list`,
      });

      // Initialize services
      initBreadcrumbs(setBreadcrumbs, managementBreadcrumb);
      initDocumentation(`${elasticWebsiteUrl}guide/en/elasticsearch/reference/${docLinkVersion}/`);
      initUiMetric(track);
      initNotification(toasts, fatalError);

      const unmountReactApp = () => {
        const appElement = document.getElementById(REACT_ROOT_ID);
        if (appElement) {
          unmountComponentAtNode(appElement);
        }
      };

      // NOTE: The New Platform will implicitly handle much of this logic by mounting the app at
      // the base route.
      routes.when(`${CRUD_APP_BASE_PATH}/:view?/:id?`, {
        template,
        controllerAs: 'remoteClusters',
        controller: class RemoteClustersController {
          constructor($scope, $route, $http, kbnUrl) {
            // NOTE: We depend upon Angular's $http service because it's decorated with interceptors,
            // e.g. to check license status per request.
            initHttp($http, prependBasePath);

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
