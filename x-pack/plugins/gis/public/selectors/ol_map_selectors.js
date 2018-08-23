/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createSelector } from 'reselect';
import { getLayerList, getMapConstants } from "./map_selectors";
import { LAYER_TYPE } from "../shared/layers/layer";
import { FEATURE_PROJECTION, getOlLayerStyle } from './ol_layer_defaults';
import * as ol from 'openlayers';

const OL_GEOJSON_FORMAT = new ol.format.GeoJSON({
  featureProjection: FEATURE_PROJECTION
});

// Layer-specific logic
function convertTmsLayersToOl(layer) {
  const tileLayer = new ol.layer.Tile({
    source: new ol.source.XYZ({
      url: layer.toLayerDescriptor().source
    })
  });
  tileLayer.setVisible(layer.isVisible());
  return tileLayer;
}

function generatePlaceHolderLayerForGeohashGrid(layer) {
  const { source } = layer.toLayerDescriptor();
  const olFeatures = OL_GEOJSON_FORMAT.readFeatures(source);
  const vectorModel = new ol.source.Vector({
    features: olFeatures
  });
  const placeHolderLayer = new ol.layer.Heatmap({
    source: vectorModel,
  });
  placeHolderLayer.setVisible(layer.isVisible());
  return placeHolderLayer;
}


const convertVectorLayersToOl = (layer) => {
  const { source } = layer.toLayerDescriptor();
  const olFeatures = OL_GEOJSON_FORMAT.readFeatures(source);
  const vectorLayer = new ol.layer.Vector({
    source: new ol.source.Vector({
      features: olFeatures
    }),
    renderMode: 'image'
  });
  vectorLayer.setVisible(layer.isVisible());
  const style = layer.getCurrentStyle();
  vectorLayer.setStyle(getOlLayerStyle(style, layer.isTemporary()));
  return vectorLayer;
};

function createCorrespondingOLLayer(layer) {
  let olLayer;
  switch (layer.getType()) {
    case LAYER_TYPE.TILE:
      olLayer = convertTmsLayersToOl(layer);
      break;
    case LAYER_TYPE.VECTOR:
      olLayer = convertVectorLayersToOl(layer);
      break;
    case LAYER_TYPE.GEOHASH_GRID:
      olLayer = generatePlaceHolderLayerForGeohashGrid(layer);
      break;
    default:
      throw new Error('Cannot create corresponding OL layer');
      break;
  }
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

function updateFillAndOutlineStyle(olLayer, layer) {
  const style = layer.getCurrentStyle();
  const appliedStyle = getOlLayerStyle(style, layer.isTemporary());
  olLayer.setStyle && olLayer.setStyle(appliedStyle);
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

export const getOlMapAndLayers = createSelector(
  getOlMap,
  getLayersWithOl,
  (olMap, layersWithOl) => {
    const layersIds = getLayersIds(olMap.getLayers());
    // Adds & updates
    layersWithOl.forEach(({ olLayer, layer }) => {
      addLayers(olMap, olLayer, layersIds);
      olLayer.setVisible(layer.isVisible());
      if (layer.getType() === LAYER_TYPE.VECTOR) {
        //todo: this function is NOT universally applicable
        //hence the if-branch is just hack to not silently fail on tile and heatmaplayers
        //needs to be factored into the class
        updateFillAndOutlineStyle(olLayer, layer);
      }
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
