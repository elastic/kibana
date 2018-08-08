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

function convertLayersByType(layerList) {
  return layerList.map(layer => {
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
    return layer;
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

export const getOlLayers = createSelector(
  getLayerList,
  layerList => convertLayersByType(layerList)
);

export const getOlLayersBySource = createSelector(
  getOlLayers,
  layers => _.groupBy(layers, ({ appData }) => appData.source)
);

export const getOlLayersByType = createSelector(
  getOlLayers,
  layers => _.groupBy(layers, ({ appData }) => appData.layerType)
);