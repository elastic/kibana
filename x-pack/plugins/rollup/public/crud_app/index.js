/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { Provider } from 'react-redux';
import { HashRouter } from 'react-router-dom';
import { management } from 'ui/management';
import routes from 'ui/routes';

import { CRUD_APP_BASE_PATH } from '../../common/constants';
import { App } from './app';
import template from './main.html';
import { indexRollupJobsStore } from './store';

const esSection = management.getSection('elasticsearch');

esSection.register('index_rollup_jobs', {
  visible: true,
  display: 'Index Rollup Jobs',
  order: 2,
  url: `#${CRUD_APP_BASE_PATH}home`
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
    <Provider store={indexRollupJobsStore()}>
      <HashRouter>
        <App />
      </HashRouter>
    </Provider>,
    elem
  );
};

routes.when(`${CRUD_APP_BASE_PATH}:view?`, {
  template: template,
  controllerAs: 'indexRollupJobs',
  controller: class IndexRollupJobsController {
    constructor($scope, $route) {
      $scope.$$postDigest(() => {
        const elem = document.getElementById('indexRollupJobsReactRoot');
        renderReact(elem);
        manageAngularLifecycle($scope, $route, elem);
      });
    }
  }
});
