/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as ol from 'openlayers';

export const WEBMERCATOR = 'EPSG:3857';
export const WGS_84 = 'EPSG:4326';

const defaultColor = '#e6194b';
const tempFillOpacity = '05';
const fillOpacity = '15';
const tempStrokeOpacity = '77';
const strokeOpacity = 'FF';

export const getOlLayerStyle = (fillAndOutlineStyle, temp = false) => {
  const color = fillAndOutlineStyle.getHexColor() || defaultColor;
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
