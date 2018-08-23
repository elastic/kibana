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

import { CRUD_APP_BASE_PATH } from '../../common/constants';
import { setHttpClient } from './services';
import { App } from './app';
import template from './main.html';
import { rollupJobsStore } from './store';

const esSection = management.getSection('elasticsearch');

esSection.register('rollup_jobs', {
  visible: true,
  display: 'Rollup Jobs',
  order: 2,
  url: `#${CRUD_APP_BASE_PATH}`
});

export const manageAngularLifecycle = ($scope, $route, elem) => {
  const lastRoute = $route.current;

  const deregister = $scope.$on('$locationChangeSuccess', () => {
    const currentRoute = $route.current;
    if (lastRoute.$$route.template === currentRoute.$$route.template) {
      $route.current = lastRoute;
    }
  });

  $scope.$on('$destroy', () => {
    deregister && deregister();
    elem && unmountComponentAtNode(elem);
  });
};

const renderReact = async (elem) => {
  render(
    <I18nProvider>
      <Provider store={rollupJobsStore()}>
        <HashRouter>
          <App />
        </HashRouter>
      </Provider>
    </I18nProvider>,
    elem
  );
};

routes.when(`${CRUD_APP_BASE_PATH}:view?`, {
  template: template,
  controllerAs: 'rollupJobs',
  controller: class IndexRollupJobsController {
    constructor($scope, $route, $http) {
      // NOTE: We depend upon Angular's $http service because it's decorated with interceptors,
      // e.g. to check license status per request.
      setHttpClient($http);

      $scope.$$postDigest(() => {
        const elem = document.getElementById('rollupJobsReactRoot');
        renderReact(elem);
        manageAngularLifecycle($scope, $route, elem);
      });
    }
  }
});
