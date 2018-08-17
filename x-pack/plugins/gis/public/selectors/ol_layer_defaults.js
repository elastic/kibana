/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as ol from 'openlayers';
import { LAYER_TYPE } from '../shared/layers/layer';

export const FEATURE_PROJECTION = 'EPSG:3857';

const defaultColor = '#e6194b';
const tempFillOpacity = '05';
const fillOpacity = '15';
const tempStrokeOpacity = '77';
const strokeOpacity = 'FF';

export const getOlLayerStyle = ({ color = defaultColor }, temp = false) => {
  return new ol.style.Style({
    fill: new ol.style.Fill({
      // TODO: Make alpha channel adjustable
      color: `${color}${temp ? tempFillOpacity : fillOpacity}`,
    }),
    stroke: new ol.style.Stroke({
      color: `${color}${temp ? tempStrokeOpacity : strokeOpacity}`,
      width: temp ? 1 : 2
    })
  });
};

export const olLayerCapabilities = (function () {
  const defaultVectorCapabilities = {
    css: true,
    choropleth: false,
    spatialJoin: false,
    pointsOnly: false,
    poi: false,
    styleSheet: true
  };
  return type => {
    switch(type) {
      case LAYER_TYPE.VECTOR:
        return defaultVectorCapabilities;
      case LAYER_TYPE.TILE:
      default:
        console.log(`${type} not yet implemented`);
        return {};
    }
  };
}());