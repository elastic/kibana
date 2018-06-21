/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createSelector } from 'reselect';
import { getLayersByType } from "./map_selectors";
import * as ol from 'openlayers';
import _ from 'lodash';
import { LAYER_TYPE } from "../actions/map_actions";

// Layer-specific logic
function convertTmsLayersToOl(tmsLayerArr) {
  return tmsLayerArr.map(layer => {
    return new ol.layer.Tile({
      source: new ol.source.XYZ({
        url: layer.details.service[0].url
      })
    });
  });
}

function updateLayersByType(layersObject) {
  _.each(layersObject, (layerArr, layerType) => {
    switch (layerType) {
      case LAYER_TYPE.TMS:
        layersObject[layerType] = convertTmsLayersToOl(layerArr);
        break;
      default:
        break;
    }
  });
  return layersObject;
}

// Selectors
export function getOlLayers(state) {
  return createSelector(
    getLayersByType,
    layersObject => updateLayersByType(layersObject)
  )(state);
}
