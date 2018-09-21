/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { Provider } from 'react-redux';
import { HashRouter } from 'react-router-dom';
import { setTelemetryOptInService, setTelemetryEnabled, setHttpClient, TelemetryOptInProvider } from './lib/telemetry';


import App from './app';
import { BASE_PATH } from "../common/constants/base_path";

import routes from 'ui/routes';
import { XPackInfoProvider as xpackInfoProvider } from 'plugins/xpack_main/services/xpack_info';

import template from './main.html';
import { licenseManagementStore } from './store';

const renderReact = (elem, store) => {
  render(
    <Provider store={store}>
      <HashRouter>
        <App />
      </HashRouter>
    </Provider>,
    elem
  );
};

/*
  This method handles the cleanup needed when route is scope is destroyed.  It also prevents Angular
  from destroying scope when route changes and both old route and new route are this same route.
*/
const manageAngularLifecycle = ($scope, $route, elem) => {
  const lastRoute = $route.current;
  const deregister = $scope.$on('$locationChangeSuccess', () => {
    const currentRoute = $route.current;
    // if templates are the same we are on the same route
    if (lastRoute.$$route.template === currentRoute.$$route.template) {
      // this prevents angular from destroying scope
      $route.current = lastRoute;
    }
  });
  $scope.$on('$destroy', () => {
    deregister && deregister();
    // manually unmount component when scope is destroyed
    elem && unmountComponentAtNode(elem);
  });
};
const initializeTelemetry = ($injector) => {
  const telemetryEnabled = $injector.get('telemetryEnabled');
  const Private = $injector.get('Private');
  const telemetryOptInProvider = Private(TelemetryOptInProvider);
  setTelemetryOptInService(telemetryOptInProvider);
  setTelemetryEnabled(telemetryEnabled);
  setHttpClient($injector.get('$http'));
};
routes
  .when(`${BASE_PATH}:view?`, {
    template: template,
    controllerAs: 'licenseManagement',
    controller: class LicenseManagementController {

      constructor($injector, $window, $rootScope, $scope, $route, kbnUrl) {
        initializeTelemetry($injector);
        let autoLogout = null;
        /* if security is disabled, there will be no autoLogout service,
         so just substitute noop function in that case */
        try {
          autoLogout = $injector.get('autoLogout');
        } catch (e) {
          autoLogout = () => {};
        }

        $scope.$$postDigest(() => {
          const elem = document.getElementById('licenseReactRoot');
          const xPackInfo = xpackInfoProvider($window, $injector, $injector.get('Private'));
          const initialState = { license: xPackInfo.get('license') };
          const kbnUrlWrapper = {
            change(url) {
              kbnUrl.change(url);
              $rootScope.$digest();
            }
          };
          const services = { autoLogout, xPackInfo, kbnUrl: kbnUrlWrapper };
          const store = licenseManagementStore(initialState, services);
          renderReact(elem, store);
          manageAngularLifecycle($scope, $route, elem);
        });
      }
    }
  });
