/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import './kibana_services';

import './vendor/jquery_ui_sortable.js';
import './vendor/jquery_ui_sortable.css';

// import the uiExports that we want to "use"
import 'uiExports/fieldFormats';
import 'uiExports/inspectorViews';
import 'uiExports/search';
import 'ui/agg_types';

import chrome from 'ui/chrome';
import routes from 'ui/routes';
import { uiModules } from 'ui/modules';
import 'ui/autoload/styles';
import 'ui/autoload/all';
import 'react-vis/dist/style.css';

import "mapbox-gl/dist/mapbox-gl.css";

import 'ui/vis/map/service_settings';
import './angular/services/workspace_saved_object_loader';
import './angular/workspace_controller';
import listingTemplate from './angular/listing_ng_wrapper.html';
import workspaceTemplate from './angular/workspace.html';
import { WorkspaceListing } from './shared/components/workspace_listing';

const app = uiModules.get('app/gis', ['ngRoute', 'react']);

app.directive('workspaceListing', function (reactDirective) {
  return reactDirective(WorkspaceListing);
});

routes.enable();

routes
  .when('/', {
    template: listingTemplate,
    controller($scope, gisWorkspaceSavedObjectLoader, config) {
      $scope.listingLimit = config.get('savedObjects:listingLimit');
      $scope.find = (search) => {
        return gisWorkspaceSavedObjectLoader.find(search, $scope.listingLimit);
      };
      $scope.delete = (ids) => {
        return gisWorkspaceSavedObjectLoader.delete(ids);
      };
    },
    resolve: {
      hasWorkspaces: function (kbnUrl) {
        chrome.getSavedObjectsClient().find({ type: 'gis-workspace', perPage: 1 }).then(resp => {
          // Do not show empty listing page, just redirect to a new workspace
          if (resp.savedObjects.length === 0) {
            kbnUrl.redirect('/workspace');
          }

          return true;
        });
      }
    }
  })
  .when('/workspace', {
    template: workspaceTemplate,
    controller: 'GisWorkspaceController',
    resolve: {
      workspace: function (gisWorkspaceSavedObjectLoader, redirectWhenMissing) {
        return gisWorkspaceSavedObjectLoader.get()
          .catch(redirectWhenMissing({
            'workspace': '/'
          }));
      }
    }
  })
  .when('/workspace/:id', {
    template: workspaceTemplate,
    controller: 'GisWorkspaceController',
    resolve: {
      workspace: function (gisWorkspaceSavedObjectLoader, redirectWhenMissing, $route) {
        const id = $route.current.params.id;
        return gisWorkspaceSavedObjectLoader.get(id)
          .catch(redirectWhenMissing({
            'workspace': '/'
          }));
      }
    }
  })
  .otherwise({
    redirectTo: '/'
  });
