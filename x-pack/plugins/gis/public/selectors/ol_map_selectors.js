/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createSelector } from 'reselect';
import { getLayerList, getMapConstants } from "./map_selectors";
import { LAYER_TYPE } from "../shared/layers/layer";
import { FEATURE_PROJECTION, tempVectorStyle, getOlLayerStyle }
  from './ol_layer_defaults';
import * as ol from 'openlayers';
import _ from 'lodash';

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
  return ({ source, visible, temporary, style }) => {
    const olFeatures = geojsonFormat.readFeatures(source);
    const vectorLayer = new ol.layer.Vector({
      source: new ol.source.Vector({
        features: olFeatures
      })
    });
    vectorLayer.setVisible(visible);
    temporary && vectorLayer.setStyle(tempVectorStyle)
      || vectorLayer.setStyle(getOlLayerStyle(style));
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
    } else { return false; }
  });
}

// Selectors
const getOlMap = createSelector(
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

const getLayersWithOl = createSelector(
  getOlMap,
  getLayerList,
  (olMap, layerList) => {
    const layersIds = getLayersIds(olMap.getLayers());
    return layerList.map(layer => {
      if (layersIds.find(id => id === layer.id)) {
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
  (olMap, layersWithOl) => {
    const layersIds = getLayersIds(olMap.getLayers());
    layersWithOl.forEach(({ id, olLayer, visible, style }) => {
      if (!layersIds.find(layerId => layerId === id)) {
        olMap.addLayer(olLayer);
      }
      // Individual layer-specific updates
      olLayer.setVisible(visible);
      const appliedStyle = getOlLayerStyle(style)
        || tempVectorStyle;
      olLayer.setStyle && olLayer.setStyle(appliedStyle);
    });
    // Layer order updates
    const oldLayerIdsOrder = getLayersIds(olMap.getLayers());
    const newLayerIdsOrder = layersWithOl.map(({ id }) => id);
    if (oldLayerIdsOrder !== newLayerIdsOrder) {
      updateMapLayerOrder(olMap.getLayers(), oldLayerIdsOrder, newLayerIdsOrder);
    }
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