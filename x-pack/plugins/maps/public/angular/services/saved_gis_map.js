/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { uiModules } from 'ui/modules';
import { createLegacyClass } from 'ui/utils/legacy_class';
import { SavedObjectProvider } from 'ui/courier';
import {
  getTimeFilters,
  getMapZoom,
  getMapCenter,
  getLayerListRaw,
  getMapExtent,
  getRefreshConfig,
  getQuery,
} from '../../selectors/map_selectors';
import { convertMapExtentToPolygon } from '../../elasticsearch_geo_utils';

const module = uiModules.get('app/maps');

module.factory('SavedGisMap', function (Private) {
  const SavedObject = Private(SavedObjectProvider);
  createLegacyClass(SavedGisMap).inherits(SavedObject);
  function SavedGisMap(id) {
    SavedGisMap.Super.call(this, {
      type: SavedGisMap.type,
      mapping: SavedGisMap.mapping,
      searchSource: SavedGisMap.searchsource,

      // if this is null/undefined then the SavedObject will be assigned the defaults
      id: id,

      // default values that will get assigned if the doc is new
      defaults: {
        title: 'New Map',
        description: '',
      },
    });

    this.showInRecentlyAccessed = true;
  }

  SavedGisMap.type = 'map';

  // Mappings are used to place object properties into saved object _source
  SavedGisMap.mapping = {
    title: 'text',
    description: 'text',
    mapStateJSON: 'text',
    layerListJSON: 'text',
    uiStateJSON: 'text',
    bounds: {
      type: 'object'
    }
  };

  SavedGisMap.fieldOrder = ['title', 'description'];

  SavedGisMap.searchsource = false;

  SavedGisMap.prototype.getFullPath = function () {
    return `/app/maps#map/${this.id}`;
  };

  SavedGisMap.prototype.syncWithStore = function (state) {
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
      refreshConfig: getRefreshConfig(state),
      query: _.omit(getQuery(state), 'queryLastTriggeredAt'),
    });

    this.uiStateJSON = JSON.stringify({});

    this.bounds = convertMapExtentToPolygon(getMapExtent(state));
  };

  return SavedGisMap;
});
