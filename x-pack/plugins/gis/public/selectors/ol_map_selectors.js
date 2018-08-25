/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createSelector } from 'reselect';
import { getLayerList, getMapConstants } from "./map_selectors";
import { WEBMERCATOR, WGS_84 } from '../shared/ol_layer_defaults';
import * as ol from 'openlayers';
import _ from 'lodash';

function createCorrespondingOLLayer(layer) {
  const olLayer = layer.createCorrespondingOLLayer();
  olLayer.set('id', layer.getId());
  return olLayer;
}

// OpenLayers helper function
const getLayersIds = mapLayers => mapLayers
  && mapLayers.getArray().map(layer => layer.get('id') || []);


function updateMapLayerOrder(mapLayers, oldLayerOrder, newLayerOrder) {
  let layerToMove;
  let newIdx;
  newLayerOrder.some((newOrderId, idx) => {
    if (oldLayerOrder[idx] !== newOrderId) {
      layerToMove = mapLayers.removeAt(idx);
      newIdx = newLayerOrder.findIndex(id => id === oldLayerOrder[idx]);
      mapLayers.insertAt(newIdx, layerToMove);
      updateMapLayerOrder(mapLayers, getLayersIds(mapLayers), newLayerOrder);
      return true;
    } else {
      return false;
    }
  });
}

function addLayers(map, newLayer, currentLayersIds) {
  if (!currentLayersIds.find(layerId => layerId === newLayer.get('id'))) {
    map.addLayer(newLayer);
  }
}

function removeLayers(map, existingMapLayers, updatedLayersIds) {
  const layersToRemove = [];
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
const syncOLMap = createSelector(
  getOLImplementation,
  getMapConstants,
  (olMap, mapConstants) => {
    const olView = olMap.getView();
    const center = olView.getCenter();
    const zoom = olView.getZoom();
    const centerInLonLat = ol.proj.transform(center, WEBMERCATOR, WGS_84);
    //make comparison in lon-lat, to avoid precision errors when projecting in the other direction.
    //this could trigger infinite loops of dispatching extent-changed actions
    if (typeof mapConstants.zoom === 'number' && mapConstants.zoom !== zoom) {
      olView.setZoom(mapConstants.zoom);
    }
    if (mapConstants.center && !_.isEqual(mapConstants.center, centerInLonLat)) {
      const centerInWorldRef = ol.proj.transform(mapConstants.center, WGS_84, WEBMERCATOR);
      olView.setCenter(centerInWorldRef);
    }
    return olMap;
  }
);

const syncLayerInitialization = createSelector(
  syncOLMap,
  getLayerList,
  (olMap, layerList) => {
    return layerList.map(layer => {
      const layerTuple = {  layer: layer };
      const olLayerArray = olMap.getLayers().getArray();
      const olLayer = olLayerArray.find(olLayer => olLayer.get('id') === layer.getId());
      if (olLayer) {
        layerTuple.olLayer = olLayer;
      } else {
        layerTuple.olLayer = createCorrespondingOLLayer(layer);
      }
      return layerTuple;
    });
  }
);

export const syncOLState = createSelector(
  syncOLMap,
  syncLayerInitialization,
  (olMap, layersWithOl) => {
    const layersIds = getLayersIds(olMap.getLayers());
    // Adds & updates
    layersWithOl.forEach(({ olLayer, layer }) => {
      addLayers(olMap, olLayer, layersIds);
      olLayer.setVisible(layer.isVisible());
      layer.syncOLStyle(olLayer);
    });
    const newLayerIdsOrder = layersWithOl.map(({ layer }) => layer.getId());
    // Deletes
    removeLayers(olMap, olMap.getLayers(), newLayerIdsOrder);
    // Update layers order
    const oldLayerIdsOrder = getLayersIds(olMap.getLayers());
    if (oldLayerIdsOrder !== newLayerIdsOrder) {//todo: evaluates to true always
      updateMapLayerOrder(olMap.getLayers(), oldLayerIdsOrder, newLayerIdsOrder);
    }
    return olMap;
  }
);
