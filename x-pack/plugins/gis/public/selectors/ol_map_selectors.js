/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createSelector } from 'reselect';
import { getLayerList } from "./map_selectors";
import * as ol from 'openlayers';
import { LAYER_TYPE } from "../actions/map_actions";

// Layer-specific logic
function convertTmsLayersToOl({ details }) {
  return new ol.layer.Tile({
    source: new ol.source.XYZ({
      url: details.service[0].url
    })
  });
}

function updateLayersByType(layerList) {
  return layerList.map(layer => {
    switch (layer.appData.layerType) {
      case LAYER_TYPE.TMS:
        layer.olLayer = convertTmsLayersToOl(layer);
        break;
      default:
        break;
    }
    return layer;
  });
}

// Selectors
export function getOlLayers(state) {
  return createSelector(
    getLayerList,
    layerList => updateLayersByType(layerList)
  )(state);
}
