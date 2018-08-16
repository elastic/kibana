/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as ol from 'openlayers';
import { LAYER_TYPE } from '../shared/layers/layer';

export const FEATURE_PROJECTION = 'EPSG:3857';

export const tempVectorStyle = new ol.style.Style({
  fill: new ol.style.Fill({
    color: [60, 25, 215, .02]
  }),
  stroke: new ol.style.Stroke({
    color: [60, 25, 225, .4],
    width: 1
  })
});

export const getOlLayerStyle = ({ color }) => {
  return new ol.style.Style({
    fill: new ol.style.Fill({
      // TODO: Make alpha channel adjustable
      color: `${color}15`
    }),
    stroke: new ol.style.Stroke({
      color,
      width: 2
    })
  });
};


export const defaultVectorStyle = new ol.style.Style({
  fill: new ol.style.Fill({
    color: [60, 25, 215, .05]
  }),
  stroke: new ol.style.Stroke({
    color: [60, 25, 225, .8],
    width: 2
  })
});

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