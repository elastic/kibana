/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
// @ts-ignore
import template from 'plugins/spaces/views/management/template.html';
import { SpacesNavState } from 'plugins/spaces/views/nav_control';
import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import 'ui/autoload/styles';
import { I18nContext } from 'ui/i18n';
// @ts-ignore
import routes from 'ui/routes';
import { SpacesManager } from '../../lib/spaces_manager';
import { ManageSpacePage } from './edit_space';
import { getCreateBreadcrumbs, getEditBreadcrumbs, getListBreadcrumbs } from './lib';
import { SpacesGridPage } from './spaces_grid';
const reactRootNodeId = 'manageSpacesReactRoot';

routes.when('/management/spaces/list', {
  template,
  k7Breadcrumbs: getListBreadcrumbs,
  controller(
    $scope: any,
    $http: any,
    chrome: any,
    spacesNavState: SpacesNavState,
    spaceSelectorURL: string
  ) {
    $scope.$$postDigest(async () => {
      const domNode = document.getElementById(reactRootNodeId);

      const spacesManager = new SpacesManager($http, chrome, spaceSelectorURL);

      render(
        <I18nContext>
          <SpacesGridPage spacesManager={spacesManager} spacesNavState={spacesNavState} />
        </I18nContext>,
        domNode
      );

      // unmount react on controller destroy
      $scope.$on('$destroy', () => {
        if (domNode) {
          unmountComponentAtNode(domNode);
        }
      });
    });
  },
});

routes.when('/management/spaces/create', {
  template,
  k7Breadcrumbs: getCreateBreadcrumbs,
  controller(
    $scope: any,
    $http: any,
    chrome: any,
    spacesNavState: SpacesNavState,
    spaceSelectorURL: string
  ) {
    $scope.$$postDigest(async () => {
      const domNode = document.getElementById(reactRootNodeId);

      const spacesManager = new SpacesManager($http, chrome, spaceSelectorURL);

      render(
        <I18nContext>
          <ManageSpacePage spacesManager={spacesManager} spacesNavState={spacesNavState} />
        </I18nContext>,
        domNode
      );

      // unmount react on controller destroy
      $scope.$on('$destroy', () => {
        if (domNode) {
          unmountComponentAtNode(domNode);
        }
      });
    });
  },
});

routes.when('/management/spaces/edit', {
  redirectTo: '/management/spaces/list',
});

routes.when('/management/spaces/edit/:spaceId', {
  template,
  k7Breadcrumbs: () => getEditBreadcrumbs(),
  controller(
    $scope: any,
    $http: any,
    $route: any,
    chrome: any,
    spacesNavState: SpacesNavState,
    spaceSelectorURL: string
  ) {
    $scope.$$postDigest(async () => {
      const domNode = document.getElementById(reactRootNodeId);

      const { spaceId } = $route.current.params;

      const spacesManager = new SpacesManager($http, chrome, spaceSelectorURL);

      render(
        <I18nContext>
          <ManageSpacePage
            spaceId={spaceId}
            spacesManager={spacesManager}
            spacesNavState={spacesNavState}
            setBreadcrumbs={breadcrumbs => {
              chrome.breadcrumbs.set(breadcrumbs);
            }}
          />
        </I18nContext>,
        domNode
      );

      // unmount react on controller destroy
      $scope.$on('$destroy', () => {
        if (domNode) {
          unmountComponentAtNode(domNode);
        }
      });
    });
  },
});
