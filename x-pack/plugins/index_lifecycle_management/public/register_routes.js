/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render } from 'react-dom';
import { Provider } from 'react-redux';
import { setHttpClient } from './api';

import { App } from './app';
import { BASE_PATH } from '../common/constants/base_path';
import { indexLifecycleManagementStore } from './store';
import { I18nProvider } from '@kbn/i18n/react';
import { setUrlService } from './services/navigation';

import routes from 'ui/routes';

import template from './main.html';
import { manageAngularLifecycle } from './lib/manage_angular_lifecycle';

const renderReact = async (elem) => {
  render(
    <I18nProvider>
      <Provider store={indexLifecycleManagementStore()}>
        <App />
      </Provider>
    </I18nProvider>,
    elem
  );
};

routes.when(`${BASE_PATH}:view?/:action?/:id?`, {
  template: template,
  controllerAs: 'indexManagement',
  controller: class IndexManagementController {
    constructor($scope, $route, $http, kbnUrl, $rootScope) {
      setHttpClient($http);
      setUrlService({
        change(url) {
          kbnUrl.change(url);
          $rootScope.$digest();
        }
      });
      $scope.$$postDigest(() => {
        const elem = document.getElementById('indexLifecycleManagementReactRoot');
        renderReact(elem);
        manageAngularLifecycle($scope, $route, elem);
      });
    }
  }
});
