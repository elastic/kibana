/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render } from 'react-dom';
import { Provider } from 'react-redux';
import { HashRouter } from 'react-router-dom';
import { setHttpClient } from './services/api';

import { App } from './app';
import { BASE_PATH } from '../common/constants/base_path';

import routes from 'ui/routes';

import template from './main.html';
import { manageAngularLifecycle } from './lib/manage_angular_lifecycle';
import { indexManagementStore } from './store';

const renderReact = async (elem) => {
  render(
    <Provider store={indexManagementStore()}>
      <HashRouter>
        <App />
      </HashRouter>
    </Provider>,
    elem
  );
};

routes.when(`${BASE_PATH}:view?/:id?`, {
  template: template,
  controllerAs: 'indexManagement',
  controller: class IndexManagementController {
    constructor($scope, $route, $http) {
      setHttpClient($http);

      $scope.$$postDigest(() => {
        const elem = document.getElementById('indexManagementReactRoot');
        renderReact(elem);
        manageAngularLifecycle($scope, $route, elem);
      });
    }
  }
});
