/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import appTemplate from './angular/templates/workspace.html';
import listingTemplate from './angular/templates/listing_ng_wrapper.html';
import { getReadonlyBadge } from './badge';

import { Listing } from './components/listing';
import { getEditUrl, getNewPath, getEditPath, setBreadcrumbs } from './services/url';
import { createCachedIndexPatternProvider } from './services/index_pattern_cache';
import {
  findSavedWorkspace,
  getSavedWorkspace,
  deleteSavedWorkspace,
} from './helpers/saved_workspace_utils';
import { GraphWorkspace } from './components/graph_workspace';

export function initGraphApp(angularModule, deps) {
  const {
    chrome,
    toastNotifications,
    savedObjectsClient,
    indexPatterns,
    addBasePath,
    capabilities,
    coreStart,
    savedObjects,
  } = deps;

  const app = angularModule;

  app.directive('graphListing', function (reactDirective) {
    return reactDirective(Listing, [
      ['coreStart', { watchDepth: 'reference' }],
      ['createItem', { watchDepth: 'reference' }],
      ['findItems', { watchDepth: 'reference' }],
      ['deleteItems', { watchDepth: 'reference' }],
      ['editItem', { watchDepth: 'reference' }],
      ['getViewUrl', { watchDepth: 'reference' }],
      ['listingLimit', { watchDepth: 'reference' }],
      ['hideWriteControls', { watchDepth: 'reference' }],
      ['capabilities', { watchDepth: 'reference' }],
      ['initialFilter', { watchDepth: 'reference' }],
      ['initialPageSize', { watchDepth: 'reference' }],
    ]);
  });

  app.directive('graphWorkspace', function (reactDirective) {
    return reactDirective(
      GraphWorkspace,
      [
        ['indexPatternProvider', { watchDepth: 'reference' }],
        ['indexPatterns', { watchDepth: 'reference' }],
        ['savedWorkspace', { watchDepth: 'reference' }],
        ['workspaceId', { watchDepth: 'reference' }],
        ['query', { watchDepth: 'reference' }],
        ['deps', { watchDepth: 'reference' }],
        ['locationUrl', { watchDepth: 'reference' }],
        ['reloadRoute', { watchDepth: 'reference' }],
      ],
      {
        restrict: 'A',
      }
    );
  });

  app.config(function ($routeProvider) {
    $routeProvider
      .when('/home', {
        template: listingTemplate,
        badge: getReadonlyBadge,
        controller: function ($location, $scope) {
          $scope.listingLimit = savedObjects.settings.getListingLimit();
          $scope.initialPageSize = savedObjects.settings.getPerPage();
          $scope.create = () => {
            $location.url(getNewPath());
          };
          $scope.find = (search) => {
            return findSavedWorkspace(
              { savedObjectsClient, basePath: coreStart.http.basePath },
              search,
              $scope.listingLimit
            );
          };
          $scope.editItem = (workspace) => {
            $location.url(getEditPath(workspace));
          };
          $scope.getViewUrl = (workspace) => getEditUrl(addBasePath, workspace);
          $scope.delete = (workspaces) =>
            deleteSavedWorkspace(
              savedObjectsClient,
              workspaces.map(({ id }) => id)
            );
          $scope.capabilities = capabilities;
          $scope.initialFilter = $location.search().filter || '';
          $scope.coreStart = coreStart;
          setBreadcrumbs({ chrome });
        },
      })
      .when('/workspace/:id?', {
        template: appTemplate,
        badge: getReadonlyBadge,
        controller: function ($scope, $route, $location) {
          $scope.indexPatternProvider = createCachedIndexPatternProvider(
            $route.current.locals.GetIndexPatternProvider.get
          );
          $scope.indexPatterns = $route.current.locals.indexPatterns;
          $scope.savedWorkspace = $route.current.locals.savedWorkspace;
          $scope.workspaceId = $route.current.params.id;
          $scope.query = $route.current.params.query;
          $scope.deps = deps;
          $scope.locationUrl = (path) => $location.url(path);
          $scope.reloadRoute = () => $route.reload();
        },
        resolve: {
          savedWorkspace: function ($rootScope, $route, $location) {
            return $route.current.params.id
              ? getSavedWorkspace(savedObjectsClient, $route.current.params.id).catch(function (e) {
                  toastNotifications.addError(e, {
                    title: i18n.translate('xpack.graph.missingWorkspaceErrorMessage', {
                      defaultMessage: "Couldn't load graph with ID",
                    }),
                  });
                  $rootScope.$eval(() => {
                    $location.path('/home');
                    $location.replace();
                  });
                  // return promise that never returns to prevent the controller from loading
                  return new Promise();
                })
              : getSavedWorkspace(savedObjectsClient);
          },
          indexPatterns: function () {
            return savedObjectsClient
              .find({
                type: 'index-pattern',
                fields: ['title', 'type'],
                perPage: 10000,
              })
              .then((response) => response.savedObjects);
          },
          GetIndexPatternProvider: function () {
            return indexPatterns;
          },
        },
      })
      .otherwise({
        redirectTo: '/home',
      });
  });
}
