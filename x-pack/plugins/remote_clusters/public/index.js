/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { Provider } from 'react-redux';
import { HashRouter } from 'react-router-dom';
import { I18nProvider } from '@kbn/i18n/react';
import { management } from 'ui/management';
import routes from 'ui/routes';

import { CRUD_APP_BASE_PATH } from './constants';
import { setHttpClient, setUserHasLeftApp } from './services';
import { App } from './app';
import template from './main.html';
import { remoteClustersStore } from './store';

const esSection = management.getSection('elasticsearch');

esSection.register('remote_clusters', {
  visible: true,
  display: 'Remote Clusters',
  order: 4,
  url: `#${CRUD_APP_BASE_PATH}/list`,
});

const renderReact = async (elem) => {
  render(
    <I18nProvider>
      <Provider store={remoteClustersStore}>
        <HashRouter>
          <App />
        </HashRouter>
      </Provider>
    </I18nProvider>,
    elem
  );
};

routes.when(`${CRUD_APP_BASE_PATH}/:view?/:id?`, {
  template: template,
  controllerAs: 'remoteClusters',
  controller: class RemoteClustersController {
    constructor($scope, $route, $http) {
      // NOTE: We depend upon Angular's $http service because it's decorated with interceptors,
      // e.g. to check license status per request.
      setHttpClient($http);

      // If returning to the app, we'll need to reset this state.
      setUserHasLeftApp(false);

      $scope.$$postDigest(() => {
        const appElement = document.getElementById('remoteClustersReactRoot');
        renderReact(appElement);

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
