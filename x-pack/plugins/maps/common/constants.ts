/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import { FeatureCollection } from 'geojson';
export const EMS_APP_NAME = 'kibana';
export const EMS_CATALOGUE_PATH = 'ems/catalogue';

export const EMS_FILES_CATALOGUE_PATH = 'ems/files';
export const EMS_FILES_API_PATH = 'ems/files';
export const EMS_FILES_DEFAULT_JSON_PATH = 'file';
export const EMS_GLYPHS_PATH = 'fonts';
export const EMS_SPRITES_PATH = 'sprites';

export const EMS_TILES_CATALOGUE_PATH = 'ems/tiles';
export const EMS_TILES_API_PATH = 'ems/tiles';
export const EMS_TILES_RASTER_STYLE_PATH = 'raster/style';
export const EMS_TILES_RASTER_TILE_PATH = 'raster/tile';

export const EMS_TILES_VECTOR_STYLE_PATH = 'vector/style';
export const EMS_TILES_VECTOR_SOURCE_PATH = 'vector/source';
export const EMS_TILES_VECTOR_TILE_PATH = 'vector/tile';

export const MAP_SAVED_OBJECT_TYPE = 'map';
export const APP_ID = 'maps';
export const APP_ICON = 'gisApp';

export const MAPS_APP_PATH = `app/${APP_ID}`;
export const MAP_PATH = 'map';
export const GIS_API_PATH = `api/${APP_ID}`;
export const INDEX_SETTINGS_API_PATH = `${GIS_API_PATH}/indexSettings`;
export const FONTS_API_PATH = `${GIS_API_PATH}/fonts`;

const MAP_BASE_URL = `/${MAPS_APP_PATH}/${MAP_PATH}`;
export function getNewMapPath() {
  return MAP_BASE_URL;
}
export function getExistingMapPath(id: string) {
  return `${MAP_BASE_URL}/${id}`;
}

export enum LAYER_TYPE {
  TILE = 'TILE',
  VECTOR = 'VECTOR',
  VECTOR_TILE = 'VECTOR_TILE', // for static display of mvt vector tiles with a mapbox stylesheet. Does not support any ad-hoc configurations. Used for consuming EMS vector tiles.
  HEATMAP = 'HEATMAP',
  BLENDED_VECTOR = 'BLENDED_VECTOR',
  TILED_VECTOR = 'TILED_VECTOR', // similar to a regular vector-layer, but it consumes the data as .mvt tilea iso GeoJson. It supports similar ad-hoc configurations like a regular vector layer (E.g. using IVectorStyle), although there is some loss of functionality  e.g. does not support term joining
}

export enum SORT_ORDER {
  ASC = 'asc',
  DESC = 'desc',
}

export enum SOURCE_TYPES {
  EMS_TMS = 'EMS_TMS',
  EMS_FILE = 'EMS_FILE',
  ES_GEO_GRID = 'ES_GEO_GRID',
  ES_SEARCH = 'ES_SEARCH',
  ES_PEW_PEW = 'ES_PEW_PEW',
  ES_TERM_SOURCE = 'ES_TERM_SOURCE',
  EMS_XYZ = 'EMS_XYZ', // identifies a custom TMS source. Name is a little unfortunate.
  WMS = 'WMS',
  KIBANA_TILEMAP = 'KIBANA_TILEMAP',
  REGIONMAP_FILE = 'REGIONMAP_FILE',
  GEOJSON_FILE = 'GEOJSON_FILE',
  MVT_SINGLE_LAYER = 'MVT_SINGLE_LAYER',
}

export enum FIELD_ORIGIN {
  SOURCE = 'source',
  JOIN = 'join',
}
export const JOIN_FIELD_NAME_PREFIX = '__kbnjoin__';

export const META_DATA_REQUEST_ID_SUFFIX = 'meta';
export const FORMATTERS_DATA_REQUEST_ID_SUFFIX = 'formatters';
export const SOURCE_DATA_REQUEST_ID = 'source';
export const SOURCE_META_DATA_REQUEST_ID = `${SOURCE_DATA_REQUEST_ID}_${META_DATA_REQUEST_ID_SUFFIX}`;
export const SOURCE_FORMATTERS_DATA_REQUEST_ID = `${SOURCE_DATA_REQUEST_ID}_${FORMATTERS_DATA_REQUEST_ID_SUFFIX}`;
export const SOURCE_BOUNDS_DATA_REQUEST_ID = `${SOURCE_DATA_REQUEST_ID}_bounds`;

export const MIN_ZOOM = 0;
export const MAX_ZOOM = 24;

export const DECIMAL_DEGREES_PRECISION = 5; // meters precision
export const ZOOM_PRECISION = 2;
export const DEFAULT_MAX_RESULT_WINDOW = 10000;
export const DEFAULT_MAX_INNER_RESULT_WINDOW = 100;
export const DEFAULT_MAX_BUCKETS_LIMIT = 10000;

export const FEATURE_ID_PROPERTY_NAME = '__kbn__feature_id__';
export const FEATURE_VISIBLE_PROPERTY_NAME = '__kbn_isvisibleduetojoin__';

export const MB_SOURCE_ID_LAYER_ID_PREFIX_DELIMITER = '_';

export enum ES_GEO_FIELD_TYPE {
  GEO_POINT = 'geo_point',
  GEO_SHAPE = 'geo_shape',
}

// Using strings instead of ES_GEO_FIELD_TYPE enum to avoid typeing errors where IFieldType.type is compared to value
export const ES_GEO_FIELD_TYPES = ['geo_point', 'geo_shape'];

export enum ES_SPATIAL_RELATIONS {
  INTERSECTS = 'INTERSECTS',
  DISJOINT = 'DISJOINT',
  WITHIN = 'WITHIN',
}

export const GEO_JSON_TYPE = {
  POINT: 'Point',
  MULTI_POINT: 'MultiPoint',
  LINE_STRING: 'LineString',
  MULTI_LINE_STRING: 'MultiLineString',
  POLYGON: 'Polygon',
  MULTI_POLYGON: 'MultiPolygon',
  GEOMETRY_COLLECTION: 'GeometryCollection',
};

export const POLYGON_COORDINATES_EXTERIOR_INDEX = 0;
export const LON_INDEX = 0;
export const LAT_INDEX = 1;

export const EMPTY_FEATURE_COLLECTION: FeatureCollection = {
  type: 'FeatureCollection',
  features: [],
};

export enum DRAW_TYPE {
  BOUNDS = 'BOUNDS',
  DISTANCE = 'DISTANCE',
  POLYGON = 'POLYGON',
}

export const AGG_DELIMITER = '_of_';
export enum AGG_TYPE {
  AVG = 'avg',
  COUNT = 'count',
  MAX = 'max',
  MIN = 'min',
  SUM = 'sum',
  TERMS = 'terms',
  UNIQUE_COUNT = 'cardinality',
}

export enum RENDER_AS {
  HEATMAP = 'heatmap',
  POINT = 'point',
  GRID = 'grid',
}

export enum GRID_RESOLUTION {
  COARSE = 'COARSE',
  FINE = 'FINE',
  MOST_FINE = 'MOST_FINE',
}

export const TOP_TERM_PERCENTAGE_SUFFIX = '__percentage';

export const COUNT_PROP_LABEL = i18n.translate('xpack.maps.aggs.defaultCountLabel', {
  defaultMessage: 'count',
});

export const COUNT_PROP_NAME = 'doc_count';

export enum STYLE_TYPE {
  STATIC = 'STATIC',
  DYNAMIC = 'DYNAMIC',
}

export enum LAYER_STYLE_TYPE {
  VECTOR = 'VECTOR',
  HEATMAP = 'HEATMAP',
  TILE = 'TILE',
}

export enum COLOR_MAP_TYPE {
  CATEGORICAL = 'CATEGORICAL',
  ORDINAL = 'ORDINAL',
}

export const CATEGORICAL_DATA_TYPES = ['string', 'ip', 'boolean'];
export const ORDINAL_DATA_TYPES = ['number', 'date'];

export enum SYMBOLIZE_AS_TYPES {
  CIRCLE = 'circle',
  ICON = 'icon',
}

export enum LABEL_BORDER_SIZES {
  NONE = 'NONE',
  SMALL = 'SMALL',
  MEDIUM = 'MEDIUM',
  LARGE = 'LARGE',
}

export const DEFAULT_ICON = 'marker';

export enum VECTOR_STYLES {
  SYMBOLIZE_AS = 'symbolizeAs',
  FILL_COLOR = 'fillColor',
  LINE_COLOR = 'lineColor',
  LINE_WIDTH = 'lineWidth',
  ICON = 'icon',
  ICON_SIZE = 'iconSize',
  ICON_ORIENTATION = 'iconOrientation',
  LABEL_TEXT = 'labelText',
  LABEL_COLOR = 'labelColor',
  LABEL_SIZE = 'labelSize',
  LABEL_BORDER_COLOR = 'labelBorderColor',
  LABEL_BORDER_SIZE = 'labelBorderSize',
}

export enum SCALING_TYPES {
  LIMIT = 'LIMIT',
  CLUSTERS = 'CLUSTERS',
  TOP_HITS = 'TOP_HITS',
}

export const RGBA_0000 = 'rgba(0,0,0,0)';

export enum MVT_FIELD_TYPE {
  STRING = 'String',
  NUMBER = 'Number',
}

export const SPATIAL_FILTERS_LAYER_ID = 'SPATIAL_FILTERS_LAYER_ID';

export enum INITIAL_LOCATION {
  LAST_SAVED_LOCATION = 'LAST_SAVED_LOCATION',
  FIXED_LOCATION = 'FIXED_LOCATION',
  BROWSER_LOCATION = 'BROWSER_LOCATION',
}

export enum LAYER_WIZARD_CATEGORY {
  ELASTICSEARCH = 'ELASTICSEARCH',
  REFERENCE = 'REFERENCE',
  SOLUTIONS = 'SOLUTIONS',
}

export enum VECTOR_SHAPE_TYPE {
  POINT = 'POINT',
  LINE = 'LINE',
  POLYGON = 'POLYGON',
}

// https://docs.mapbox.com/mapbox-gl-js/style-spec/expressions/#data-expressions
export enum MB_LOOKUP_FUNCTION {
  GET = 'get',
  FEATURE_STATE = 'feature-state',
}
