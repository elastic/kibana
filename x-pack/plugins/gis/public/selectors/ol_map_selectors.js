/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createSelector } from 'reselect';
import { getLayerList, getMapConstants } from "./map_selectors";
import { LAYER_TYPE } from "../shared/layers/layer";
import * as ol from 'openlayers';
import _ from 'lodash';

const FEATURE_PROJECTION = 'EPSG:3857';

const tempVectorStyle = new ol.style.Style({
  fill: new ol.style.Fill({
    color: 'rgba(160, 225, 255, .05)'
  }),
  stroke: new ol.style.Stroke({
    color: 'rgba(160, 225, 255, .8)',
    width: 1
  })
});

// Layer-specific logic
function convertTmsLayersToOl({ source, visible }) {
  const tileLayer = new ol.layer.Tile({
    source: new ol.source.XYZ({
      url: source
    })
  });
  tileLayer.setVisible(visible);
  return tileLayer;
}

const convertVectorLayersToOl = (() => {
  const geojsonFormat = new ol.format.GeoJSON({
    featureProjection: FEATURE_PROJECTION
  });
  return ({ source, visible, temporary }) => {
    const olFeatures = geojsonFormat.readFeatures(source);
    const vectorLayer = new ol.layer.Vector({
      source: new ol.source.Vector({
        features: olFeatures
      })
    });
    vectorLayer.setVisible(visible);
    temporary && vectorLayer.setStyle(tempVectorStyle);
    return vectorLayer;
  };
})();

function convertLayerByType(layer) {
  switch (layer.type) {
    case LAYER_TYPE.TILE:
      layer.olLayer = convertTmsLayersToOl(layer);
      break;
    case LAYER_TYPE.VECTOR:
      layer.olLayer = convertVectorLayersToOl(layer);
      break;
    default:
      break;
  }
  layer.olLayer.set('id', layer.id);
  return layer;
}

// OpenLayers helper function
const getLayersIds = mapLayers => mapLayers
  && mapLayers.getArray().map(layer => layer.get('id') || []);


function updateMapLayerOrder(map, oldLayerOrder, newLayerOrder) {
  const mapLayers = map.getLayers();
  let layerToMove;
  let newIdx;
  newLayerOrder.some((newOrderId, idx) => {
    if (oldLayerOrder[idx] !== newOrderId) {
      layerToMove = mapLayers.removeAt(idx);
      newIdx = newLayerOrder.findIndex(id => id === oldLayerOrder[idx]);
      mapLayers.insertAt(newIdx, layerToMove);
      updateMapLayerOrder(map, getLayersIds(mapLayers), newLayerOrder);
      return true;
    } else {
      return false;
    }
  });
}


// Selectors
export const getOlMap = createSelector(
  getMapConstants,
  mapConstants => {
    const olView = new ol.View({
      center: ol.proj.fromLonLat(mapConstants.mapCenter),
      zoom: mapConstants.mapInitZoomLevel
    });
    return new ol.Map({
      layers: [],
      view: olView
    });
  }
);

const getCurrentLayerIdsInMap = createSelector(
  getLayerList, // Just used to trigger update
  createSelector(
    getOlMap,
    map => map && map.getLayers() || null
  ),
  (layerList, mapLayers) => getLayersIds(mapLayers)
);

export const getLayersWithOl = createSelector(
  getLayerList,
  getCurrentLayerIdsInMap,
  (layerList, currentLayersInMap) => {
    return layerList.map(layer => {
      if (currentLayersInMap.find(id => id === layer.id)) {
        return layer;
      } else {
        return convertLayerByType(layer);
      }
    });
  }
);

export const getOlMapAndLayers = createSelector(
  getOlMap,
  getLayersWithOl,
  getCurrentLayerIdsInMap,
  (olMap, layersWithOl, currentLayerIdsInMap) => {
    layersWithOl.forEach((layer) => {
      const olLayerId = layer.id;
      if (!currentLayerIdsInMap.find(id => id === olLayerId)) {
        olMap.addLayer(layer.olLayer);
      } else {
        // Individual layer-specific updates
        layer.olLayer.setVisible(layer.visible);
      }
    });
    // Layer order updates
    const oldLayerIdsOrder = getLayersIds(olMap.getLayers());
    const newLayerIdsOrder = layersWithOl.map(({ id }) => id);
    updateMapLayerOrder(olMap, oldLayerIdsOrder, newLayerIdsOrder);
    return olMap;
  }
);

export const getOlLayersBySource = createSelector(
  getLayersWithOl,
  layers => _.groupBy(layers, ({ appData }) => appData.source)
);

export const getOlLayersByType = createSelector(
  getLayersWithOl,
  layers => _.groupBy(layers, ({ appData }) => appData.layerType)
);