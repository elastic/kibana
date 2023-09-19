/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum EMS_BASEMAP_KEYS {
  ROADMAP_DESATURATED = 'roadmap_desaturated',
  ROADMAP = 'roadmap',
  AUTO = 'auto',
  DARK = 'dark',
}

export enum JOIN_KEYS {
  DISTANCE = 'distance',
  TERM = 'term',
}

export enum LAYER_KEYS {
  ES_DOCS = 'es_docs',
  ES_TOP_HITS = 'es_top_hits',
  ES_TRACKS = 'es_tracks',
  ES_POINT_TO_POINT = 'es_point_to_point',
  ES_AGG_CLUSTERS = 'es_agg_clusters',
  ES_AGG_GRIDS = 'es_agg_grids',
  ES_AGG_HEXAGONS = 'es_agg_hexagons',
  ES_AGG_HEATMAP = 'es_agg_heatmap',
  ES_ML_ANOMALIES = 'es_ml_anomalies',
  EMS_REGION = 'ems_region',
  EMS_BASEMAP = 'ems_basemap',
  KBN_TMS_RASTER = 'kbn_tms_raster',
  LAYER_GROUP = 'layer_group',
  UX_TMS_RASTER = 'ux_tms_raster', // configured in the UX layer wizard of Maps
  UX_TMS_MVT = 'ux_tms_mvt', // configured in the UX layer wizard of Maps
  UX_WMS = 'ux_wms', // configured in the UX layer wizard of Maps
}

export enum RESOLUTION_KEYS {
  COARSE = 'coarse',
  FINE = 'fine',
  MOST_FINE = 'most_fine',
  SUPER_FINE = 'super_fine',
}

export enum SCALING_KEYS {
  LIMIT = 'limit',
  MVT = 'mvt',
  CLUSTERS = 'clusters',
}
