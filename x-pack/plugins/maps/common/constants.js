/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const GIS_API_PATH = 'api/maps';

export const MAP_SAVED_OBJECT_TYPE = 'map';
export function createMapPath(id) {
  return `/app/maps#/map/${id}`;
}

export const EMS_FILE = 'EMS_FILE';
export const ES_GEO_GRID = 'ES_GEO_GRID';
export const ES_SEARCH = 'ES_SEARCH';

export const DECIMAL_DEGREES_PRECISION = 5; // meters precision

export const ZOOM_PRECISION = 2;

export const DEFAULT_EMS_TILE_LAYER = 'road_map';

export const APP_ID = 'maps';

export const APP_ICON = 'gisApp';

export const SOURCE_DATA_ID_ORIGIN = 'source';

export const FEATURE_ID_PROPERTY_NAME = '__kbn__feature_id__';

export const ES_GEO_FIELD_TYPE = {
  GEO_POINT: 'geo_point',
  GEO_SHAPE: 'geo_shape'
};
