/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { HashRouter } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import { I18nContext } from 'ui/i18n';
import { management } from 'ui/management';
import routes from 'ui/routes';

import { PLUGIN } from '../common';
import { APP_BASE_PATH } from './constants';
// import { setHttpClient, setUserHasLeftApp, setRedirect } from './services';
import { App } from './app';
import template from './main.html';

const esSection = management.getSection('elasticsearch');

esSection.register(PLUGIN.ID, {
  visible: true,
  display: i18n.translate('xpack.pocKibanaCloudPlugin.appTitle', { defaultMessage: 'POC Kibana Cloud plugin' }),
  order: 99,
  url: `#${APP_BASE_PATH}`,
});

let appElement;

const renderReact = async (elem) => {
  render(
    <I18nContext>
      <HashRouter>
        <App />
      </HashRouter>
    </I18nContext>,
    elem
  );
};

routes.when(`${APP_BASE_PATH}/:view?/:id?`, {
  template: template,
  controllerAs: 'pocKibanaCloudPlugin',
  controller: class PocKibanaCloudPluginController {
    constructor($scope, $route, /*$http, kbnUrl*/) {
      if (appElement) {
        // React-router's <Redirect> will cause this controller to re-execute without the $destroy
        // handler being called. This means the app will re-mount, so we need to unmount it first
        // here.
        unmountComponentAtNode(appElement);
      }

      // NOTE: We depend upon Angular's $http service because it's decorated with interceptors,
      // e.g. to check license status per request.
      // setHttpClient($http);

      $scope.$$postDigest(() => {
        appElement = document.getElementById('pocKibanaCloudPluginReactRoot');
        renderReact(appElement);

        const appRoute = $route.current;
        const stopListeningForLocationChange = $scope.$on('$locationChangeSuccess', () => {
          const currentRoute = $route.current;
          const isNavigationInApp = currentRoute.$$route.template === appRoute.$$route.template;

          // When we navigate within rollups, prevent Angular from re-matching the route and
          // rebuilding the app.
          if (isNavigationInApp) {
            $route.current = appRoute;
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
