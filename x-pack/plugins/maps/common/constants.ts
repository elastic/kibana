/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { FeatureCollection } from 'geojson';

export const MAP_SAVED_OBJECT_TYPE = 'map';
export const APP_ID = 'maps';
export const APP_ICON = 'gisApp';
export const APP_ICON_SOLUTION = 'logoKibana';
export const APP_NAME = i18n.translate('xpack.maps.visTypeAlias.title', {
  defaultMessage: 'Maps',
});
export const INITIAL_LAYERS_KEY = 'initialLayers';

export const MAPS_APP_PATH = `app/${APP_ID}`;
export const MAP_PATH = 'map';
export const GIS_API_PATH = `api/${APP_ID}`;
export const INDEX_SETTINGS_API_PATH = `${GIS_API_PATH}/indexSettings`;
export const FONTS_API_PATH = `${GIS_API_PATH}/fonts`;
export const INDEX_SOURCE_API_PATH = `${GIS_API_PATH}/docSource`;
export const API_ROOT_PATH = `/${GIS_API_PATH}`;
export const INDEX_FEATURE_PATH = `/${GIS_API_PATH}/feature`;
export const GET_MATCHING_INDEXES_PATH = `/${GIS_API_PATH}/getMatchingIndexes`;
export const CHECK_IS_DRAWING_INDEX = `/${GIS_API_PATH}/checkIsDrawingIndex`;

export const MVT_GETTILE_API_PATH = 'mvt/getTile';
export const MVT_GETGRIDTILE_API_PATH = 'mvt/getGridTile';
export const OPEN_LAYER_WIZARD = 'openLayerWizard';
export const SAVED_OBJECTS_LIMIT_SETTING = 'savedObjects:listingLimit';
export const SAVED_OBJECTS_PER_PAGE_SETTING = 'savedObjects:perPage';

// Identifies centroid feature.
// Centroids are a single point for representing lines, multiLines, polygons, and multiPolygons
export const KBN_IS_CENTROID_FEATURE = '__kbn_is_centroid_feature__';

export function getNewMapPath() {
  return `/${MAPS_APP_PATH}/${MAP_PATH}`;
}
export function getFullPath(id: string | undefined) {
  return `/${MAPS_APP_PATH}${getEditPath(id)}`;
}
export function getEditPath(id: string | undefined) {
  return id ? `/${MAP_PATH}/${id}` : `/${MAP_PATH}`;
}

export enum LAYER_TYPE {
  RASTER_TILE = 'RASTER_TILE',
  GEOJSON_VECTOR = 'GEOJSON_VECTOR',
  EMS_VECTOR_TILE = 'EMS_VECTOR_TILE',
  HEATMAP = 'HEATMAP',
  BLENDED_VECTOR = 'BLENDED_VECTOR',
  MVT_VECTOR = 'MVT_VECTOR',
}

export enum SOURCE_TYPES {
  EMS_TMS = 'EMS_TMS',
  EMS_FILE = 'EMS_FILE',
  ES_GEO_GRID = 'ES_GEO_GRID',
  ES_GEO_LINE = 'ES_GEO_LINE',
  ES_SEARCH = 'ES_SEARCH',
  ES_PEW_PEW = 'ES_PEW_PEW',
  ES_TERM_SOURCE = 'ES_TERM_SOURCE',
  EMS_XYZ = 'EMS_XYZ', // identifies a custom TMS source. EMS-prefix in the name is a little unfortunate :(
  WMS = 'WMS',
  KIBANA_TILEMAP = 'KIBANA_TILEMAP',
  GEOJSON_FILE = 'GEOJSON_FILE',
  MVT_SINGLE_LAYER = 'MVT_SINGLE_LAYER',
  TABLE_SOURCE = 'TABLE_SOURCE',
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
export const DEFAULT_MAX_BUCKETS_LIMIT = 65535;

export const FEATURE_VISIBLE_PROPERTY_NAME = '__kbn_isvisibleduetojoin__';

export const MB_SOURCE_ID_LAYER_ID_PREFIX_DELIMITER = '_';

export enum ES_GEO_FIELD_TYPE {
  GEO_POINT = 'geo_point',
  GEO_SHAPE = 'geo_shape',
}

// Using strings instead of ES_GEO_FIELD_TYPE enum to avoid typeing errors where IndexPatternField.type is compared to value
export const ES_GEO_FIELD_TYPES = ['geo_point', 'geo_shape'];

export enum ES_SPATIAL_RELATIONS {
  INTERSECTS = 'INTERSECTS',
  DISJOINT = 'DISJOINT',
  WITHIN = 'WITHIN',
}

export enum GEO_JSON_TYPE {
  POINT = 'Point',
  MULTI_POINT = 'MultiPoint',
  LINE_STRING = 'LineString',
  MULTI_LINE_STRING = 'MultiLineString',
  POLYGON = 'Polygon',
  MULTI_POLYGON = 'MultiPolygon',
  GEOMETRY_COLLECTION = 'GeometryCollection',
}

export const POLYGON_COORDINATES_EXTERIOR_INDEX = 0;
export const LON_INDEX = 0;
export const LAT_INDEX = 1;

export const EMPTY_FEATURE_COLLECTION: FeatureCollection = {
  type: 'FeatureCollection',
  features: [],
};

export enum DRAW_MODE {
  DRAW_SHAPES = 'DRAW_SHAPES',
  DRAW_POINTS = 'DRAW_POINTS',
  DRAW_FILTERS = 'DRAW_FILTERS',
  NONE = 'NONE',
}

export enum DRAW_SHAPE {
  BOUNDS = 'BOUNDS',
  DISTANCE = 'DISTANCE',
  POLYGON = 'POLYGON',
  POINT = 'POINT',
  LINE = 'LINE',
  SIMPLE_SELECT = 'SIMPLE_SELECT',
  DELETE = 'DELETE',
  WAIT = 'WAIT',
}

export const AGG_DELIMITER = '_of_';
export enum AGG_TYPE {
  AVG = 'avg',
  COUNT = 'count',
  MAX = 'max',
  MIN = 'min',
  SUM = 'sum',
  TERMS = 'terms',
  PERCENTILE = 'percentile',
  UNIQUE_COUNT = 'cardinality',
}

export enum RENDER_AS {
  HEATMAP = 'heatmap',
  POINT = 'point',
  GRID = 'grid',
  HEX = 'hex',
}

export enum GRID_RESOLUTION {
  COARSE = 'COARSE',
  FINE = 'FINE',
  MOST_FINE = 'MOST_FINE',
  SUPER_FINE = 'SUPER_FINE',
}

export const GEOTILE_GRID_AGG_NAME = 'gridSplit';
export const GEOCENTROID_AGG_NAME = 'gridCentroid';

export const TOP_TERM_PERCENTAGE_SUFFIX = '__percentage';
export const DEFAULT_PERCENTILE = 50;

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
export const DEFAULT_CUSTOM_ICON_CUTOFF = 0.25;
export const DEFAULT_CUSTOM_ICON_RADIUS = 0.25;
export const CUSTOM_ICON_SIZE = 64;
export const CUSTOM_ICON_PREFIX_SDF = '__kbn__custom_icon_sdf__';
export const MAKI_ICON_SIZE = 16;
export const HALF_MAKI_ICON_SIZE = MAKI_ICON_SIZE / 2;

export enum ICON_SOURCE {
  CUSTOM = 'CUSTOM',
  MAKI = 'MAKI',
}

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
  MVT = 'MVT',
}

export enum MVT_FIELD_TYPE {
  STRING = 'String',
  NUMBER = 'Number',
}

export const SPATIAL_FILTERS_LAYER_ID = 'SPATIAL_FILTERS_LAYER_ID';

export enum INITIAL_LOCATION {
  LAST_SAVED_LOCATION = 'LAST_SAVED_LOCATION',
  FIXED_LOCATION = 'FIXED_LOCATION',
  BROWSER_LOCATION = 'BROWSER_LOCATION',
  AUTO_FIT_TO_BOUNDS = 'AUTO_FIT_TO_BOUNDS',
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

export enum DATA_MAPPING_FUNCTION {
  INTERPOLATE = 'INTERPOLATE',
  PERCENTILES = 'PERCENTILES',
}
export const DEFAULT_PERCENTILES = [50, 75, 90, 95, 99];

export type RawValue = string | string[] | number | boolean | undefined | null;

export type FieldFormatter = (value: RawValue) => string | number;

export const MAPS_NEW_VECTOR_LAYER_META_CREATED_BY = 'maps-new-vector-layer';

export const MAX_DRAWING_SIZE_BYTES = 10485760; // 10MB

export const emsWorldLayerId = 'world_countries';

export enum WIZARD_ID {
  CHOROPLETH = 'choropleth',
  GEO_FILE = 'uploadGeoFile',
  NEW_VECTOR = 'newVectorLayer',
  OBSERVABILITY = 'observabilityLayer',
  SECURITY = 'securityLayer',
  EMS_BOUNDARIES = 'emsBoundaries',
  EMS_BASEMAP = 'emsBaseMap',
  CLUSTERS = 'clusters',
  HEATMAP = 'heatmap',
  GEO_LINE = 'geoLine',
  POINT_2_POINT = 'point2Point',
  ES_DOCUMENT = 'esDocument',
  ES_TOP_HITS = 'esTopHits',
  KIBANA_BASEMAP = 'kibanaBasemap',
  MVT_VECTOR = 'mvtVector',
  WMS_LAYER = 'wmsLayer',
  TMS_LAYER = 'tmsLayer',
}
