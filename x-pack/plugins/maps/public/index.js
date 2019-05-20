/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import './kibana_services';

// import the uiExports that we want to "use"
import 'uiExports/autocompleteProviders';
import 'uiExports/fieldFormats';
import 'uiExports/inspectorViews';
import 'uiExports/search';
import 'uiExports/embeddableFactories';
import 'ui/agg_types';

import { capabilities } from 'ui/capabilities';
import chrome from 'ui/chrome';
import routes from 'ui/routes';
import 'ui/kbn_top_nav';
import { uiModules } from 'ui/modules';
import { DocTitleProvider } from 'ui/doc_title';
import 'ui/autoload/styles';
import 'ui/autoload/all';
import 'react-vis/dist/style.css';

import './angular/services/gis_map_saved_object_loader';
import './angular/map_controller';
import listingTemplate from './angular/listing_ng_wrapper.html';
import mapTemplate from './angular/map.html';
import { MapListing } from './shared/components/map_listing';
import { recentlyAccessed } from 'ui/persisted_log';

import { data } from 'plugins/data';
data.query.loadLegacyDirectives();

const app = uiModules.get('app/maps', ['ngRoute', 'react']);

app.directive('mapListing', function (reactDirective) {
  return reactDirective(MapListing);
});

routes.enable();

routes
  .defaults(/.*/, {
    badge: (i18n, uiCapabilities) => {
      if (uiCapabilities.maps.save) {
        return undefined;
      }

      return {
        text: i18n('xpack.maps.badge.readOnly.text', {
          defaultMessage: 'Read only',
        }),
        tooltip: i18n('xpack.maps.badge.readOnly.tooltip', {
          defaultMessage: 'Unable to save maps',
        }),
        iconType: 'glasses'
      };
    }
  })
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
      $scope.readOnly = !capabilities.get().maps.save;
    },
    resolve: {
      hasMaps: function (kbnUrl) {
        chrome.getSavedObjectsClient().find({ type: 'map', perPage: 1 }).then(resp => {
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
      map: function (gisMapSavedObjectLoader, redirectWhenMissing, $route,
        Private) {
        const id = $route.current.params.id;
        const docTitle = Private(DocTitleProvider);
        return gisMapSavedObjectLoader.get(id)
          .then((savedMap) => {
            recentlyAccessed.add(savedMap.getFullPath(), savedMap.title, id);
            docTitle.change(savedMap.title);
            return savedMap;
          })
          .catch(redirectWhenMissing({
            'map': '/'
          }));
      }
    }
  })
  .otherwise({
    redirectTo: '/'
  });
