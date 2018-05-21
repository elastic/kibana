/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import 'ui/autoload/styles';
import 'plugins/spaces/views/management/manage_spaces.less';
import template from 'plugins/spaces/views/management/template.html';

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { SpacesGridPage, ManageSpacePage } from './components';
import { SpacesManager } from '../../lib/spaces_manager';

import routes from 'ui/routes';

const reactRootNodeId = 'manageSpacesReactRoot';

routes.when('/management/spaces/list', {
  template,
  controller: function ($scope, $http, chrome) {
    const domNode = document.getElementById(reactRootNodeId);

    render(<SpacesGridPage
      httpAgent={$http}
      chrome={chrome}
      breadcrumbs={routes.getBreadcrumbs()}
    />, domNode);

    // unmount react on controller destroy
    $scope.$on('$destroy', () => {
      unmountComponentAtNode(domNode);
    });
  }
});

routes.when('/management/spaces/create', {
  template,
  controller: function ($scope,  $http, chrome) {
    const domNode = document.getElementById(reactRootNodeId);

    const spacesManager = new SpacesManager($http, chrome);

    render(<ManageSpacePage
      httpAgent={$http}
      chrome={chrome}
      breadcrumbs={routes.getBreadcrumbs()}
      spacesManager={spacesManager}
    />, domNode);

    // unmount react on controller destroy
    $scope.$on('$destroy', () => {
      unmountComponentAtNode(domNode);
    });
  }
});

routes.when('/management/spaces/edit', {
  redirectTo: '/management/spaces/list'
});

routes.when('/management/spaces/edit/:space', {
  template,
  controller: function ($scope, $http, $route, chrome) {
    const domNode = document.getElementById(reactRootNodeId);

    const { space } = $route.current.params;

    const spacesManager = new SpacesManager($http, chrome);

    render(<ManageSpacePage
      httpAgent={$http}
      space={space}
      chrome={chrome}
      breadcrumbs={routes.getBreadcrumbs()}
      spacesManager={spacesManager}
    />, domNode);

    // unmount react on controller destroy
    $scope.$on('$destroy', () => {
      unmountComponentAtNode(domNode);
    });
  }
});
