/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createSelector } from 'reselect';
import { getLayerList, getMapState, getDataSources } from "../../../selectors/map_selectors";
import { WEBMERCATOR, WGS_84 } from '../../../shared/ol_layer_defaults';
import * as ol from 'openlayers';
import _ from 'lodash';


function removeOrphanedOLLayers(olMap, layerList) {
  const updatedLayersIds = layerList.map((layer) => layer.getId());
  const layersToRemove = [];
  const existingMapLayers = olMap.getLayers();
  existingMapLayers.forEach((mapLayer, idx) => {
    if (!updatedLayersIds.find(id => id === mapLayer.get('id'))) {
      layersToRemove.push(idx);
    }
  });
  layersToRemove.forEach(layerIdx => existingMapLayers.removeAt(layerIdx));
}

const OL_VIEW = new ol.View({
  center: ol.proj.fromLonLat([0, 0]),
  zoom: 0
});
const OL_MAP = new ol.Map({
  layers: [],
  view: OL_VIEW
});

function getOLImplementation() {
  return OL_MAP;
}

// Selectors
const syncOLMapWithMapState = createSelector(
  getOLImplementation,
  getMapState,
  (olMap, mapState) => {
    const olView = olMap.getView();
    const center = olView.getCenter();
    const zoom = olView.getZoom();
    const centerInLonLat = ol.proj.transform(center, WEBMERCATOR, WGS_84);
    //make comparison in lon-lat, to avoid precision errors when projecting in the other direction.
    //this could trigger infinite loops of dispatching extent-changed actions
    if (typeof mapState.zoom === 'number' && mapState.zoom !== zoom) {
      olView.setZoom(mapState.zoom);
    }
    if (mapState.center && !_.isEqual(mapState.center, centerInLonLat)) {
      const centerInWorldRef = ol.proj.transform(mapState.center, WGS_84, WEBMERCATOR);
      olView.setCenter(centerInWorldRef);
    }
    return olMap;
  }
);

export const syncOLState = createSelector(
  syncOLMapWithMapState,
  getLayerList,
  getDataSources,
  (olMap, layerList, dataSources) => {
    removeOrphanedOLLayers(olMap, layerList);
    layerList.forEach((layer, position) => layer.syncLayerWithOL(olMap, dataSources, position));
    return olMap;
  }
);
