/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uiModules } from 'ui/modules';
import { createLegacyClass } from 'ui/utils/legacy_class';
import { SavedObjectProvider } from 'ui/courier';
import {
  getTimeFilters,
  getMapZoom,
  getMapCenter,
  getLayerListRaw,
  getMapExtent,
} from '../../selectors/map_selectors';
import { getIsDarkTheme } from '../../store/ui';

const module = uiModules.get('app/gis');

module.factory('SavedGisWorkspace', function (Private) {
  const SavedObject = Private(SavedObjectProvider);
  createLegacyClass(SavedGisWorkspace).inherits(SavedObject);
  function SavedGisWorkspace(id) {
    SavedGisWorkspace.Super.call(this, {
      type: SavedGisWorkspace.type,
      mapping: SavedGisWorkspace.mapping,
      searchSource: SavedGisWorkspace.searchsource,

      // if this is null/undefined then the SavedObject will be assigned the defaults
      id: id,

      // default values that will get assigned if the doc is new
      defaults: {
        title: 'New Workspace',
        description: '',
        layerListJSON: JSON.stringify([
          {
            id: "0hmz5",
            label: 'EMS base layer (road_map)',
            sourceDescriptor: { "type": "EMS_TMS", "id": "road_map" },
            visible: true,
            temporary: false,
            style: {},
            type: "TILE",
            minZoom: 0,
            maxZoom: 24,
          }
        ])
      },
    });

    this.showInRecentlyAccessed = true;
  }

  SavedGisWorkspace.type = 'gis-workspace';

  // Mappings are used to place object properties into saved object _source
  SavedGisWorkspace.mapping = {
    title: 'text',
    description: 'text',
    mapStateJSON: 'text',
    layerListJSON: 'text',
    uiStateJSON: 'text',
    bounds: {
      type: 'object'
    }
  };

  SavedGisWorkspace.fieldOrder = ['title', 'description'];

  SavedGisWorkspace.searchsource = false;

  SavedGisWorkspace.prototype.getFullPath = function () {
    return `/app/gis#workspace/${this.id}`;
  };

  SavedGisWorkspace.prototype.syncWithStore = function (state) {
    const layerList = getLayerListRaw(state);
    // Layer list from store contains requested data.
    // We do not want to store this in the saved object so it is getting removed
    const layerListConfigOnly = layerList.map(layer => {
      delete layer.dataRequests;
      return layer;
    });
    this.layerListJSON = JSON.stringify(layerListConfigOnly);

    this.mapStateJSON = JSON.stringify({
      zoom: getMapZoom(state),
      center: getMapCenter(state),
      timeFilters: getTimeFilters(state),
    });

    this.uiStateJSON = JSON.stringify({
      isDarkMode: getIsDarkTheme(state),
    });

    const mapExtent = getMapExtent(state);
    this.bounds = {
      "type": "envelope",
      "coordinates": [ [mapExtent.min_lon, mapExtent.max_lat], [mapExtent.max_lon, mapExtent.min_lat] ]
    };
  };

  return SavedGisWorkspace;
});
