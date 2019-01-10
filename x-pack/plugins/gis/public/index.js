/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import './kibana_services';

import './vendor/jquery_ui_sortable.js';
import './vendor/jquery_ui_sortable.css';

// import the uiExports that we want to "use"
import 'uiExports/autocompleteProviders';
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
import './angular/services/gis_map_saved_object_loader';
import './angular/map_controller';
import listingTemplate from './angular/listing_ng_wrapper.html';
import mapTemplate from './angular/map.html';
import { MapListing } from './shared/components/map_listing';

const app = uiModules.get('app/gis', ['ngRoute', 'react']);

app.directive('mapListing', function (reactDirective) {
  return reactDirective(MapListing);
});

routes.enable();

routes
  .when('/', {
    template: listingTemplate,
    controller($scope, gisMapSavedObjectLoader, config) {
      $scope.listingLimit = config.get('savedObjects:listingLimit');
      $scope.find = (search) => {
        return gisMapSavedObjectLoader.find(search, $scope.listingLimit);
      };
      $scope.delete = (ids) => {
        return gisMapSavedObjectLoader.delete(ids);
      };
    },
    resolve: {
      hasMaps: function (kbnUrl) {
        chrome.getSavedObjectsClient().find({ type: 'gis-map', perPage: 1 }).then(resp => {
          // Do not show empty listing page, just redirect to a new map
          if (resp.savedObjects.length === 0) {
            kbnUrl.redirect('/map');
          }

          return true;
        });
      }
    }
  })
  .when('/map', {
    template: mapTemplate,
    controller: 'GisMapController',
    resolve: {
      map: function (gisMapSavedObjectLoader, redirectWhenMissing) {
        return gisMapSavedObjectLoader.get()
          .catch(redirectWhenMissing({
            'map': '/'
          }));
      }
    }
  })
  .when('/map/:id', {
    template: mapTemplate,
    controller: 'GisMapController',
    resolve: {
      map: function (gisMapSavedObjectLoader, redirectWhenMissing, $route) {
        const id = $route.current.params.id;
        return gisMapSavedObjectLoader.get(id)
          .catch(redirectWhenMissing({
            'map': '/'
          }));
      }
    }
  })
  .otherwise({
    redirectTo: '/'
  });
