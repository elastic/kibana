/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render } from 'react-dom';
import { Provider } from 'react-redux';
import { HashRouter } from 'react-router-dom';
import { I18nProvider } from '@kbn/i18n/react';
import { management } from 'ui/management';
import routes from 'ui/routes';

import { CRUD_APP_BASE_PATH } from './constants';
import template from './main.html';

import { setHttpClient } from './services/api';
import { manageAngularLifecycle } from './lib/manage_angular_lifecycle';

import { remoteClustersManagementStore } from './store';

const esSection = management.getSection('elasticsearch');

esSection.register('remote_clusters_management', {
  visible: true,
  display: 'Remote Clusters Management',
  order: 4,
  url: `#${CRUD_APP_BASE_PATH}/list`,
});

const renderReact = async (elem) => {
  render(
    <I18nProvider>
      <Provider store={remoteClustersManagementStore}>
        <HashRouter>
          <p>This is a placeholder.</p>
        </HashRouter>
      </Provider>
    </I18nProvider>,
    elem
  );
};

routes.when(`${CRUD_APP_BASE_PATH}/:view?`, {
  template: template,
  controllerAs: 'remoteClustersManagement',
  controller: class RemoteClustersManagementController {
    constructor($scope, $route, $http) {
      // NOTE: We depend upon Angular's $http service because it's decorated with interceptors,
      // e.g. to check license status per request.
      setHttpClient($http);

      $scope.$$postDigest(() => {
        const elem = document.getElementById('remoteClustersManagementReactRoot');
        renderReact(elem);
        manageAngularLifecycle($scope, $route, elem);
      });
    }
  }
});
