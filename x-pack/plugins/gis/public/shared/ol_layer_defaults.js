/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as ol from 'openlayers';

export const WEBMERCATOR = 'EPSG:3857';
export const WGS_84 = 'EPSG:4326';

export const OL_GEOJSON_FORMAT = new ol.format.GeoJSON({
  featureProjection: WEBMERCATOR
});
