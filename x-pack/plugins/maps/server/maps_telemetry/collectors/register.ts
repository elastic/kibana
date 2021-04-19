/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { getMapsTelemetry, MapsUsage } from '../maps_telemetry';
import { MapsConfigType } from '../../../config';
import { TELEMETRY_EMS_BASEMAP_TYPES, TELEMETRY_LAYER_TYPE } from '../util';
import { SCALING_TYPES } from '../../../common';

export function registerMapsUsageCollector(
  usageCollection: UsageCollectionSetup,
  config: MapsConfigType
): void {
  if (!usageCollection) {
    return;
  }

  const mapsUsageCollector = usageCollection.makeUsageCollector<MapsUsage>({
    type: 'maps',
    isReady: () => true,
    fetch: async () => await getMapsTelemetry(config),
    schema: {
      settings: {
        showMapVisualizationTypes: { type: 'boolean' },
      },
      indexPatternsWithGeoFieldCount: { type: 'long' },
      indexPatternsWithGeoPointFieldCount: { type: 'long' },
      indexPatternsWithGeoShapeFieldCount: { type: 'long' },
      geoShapeAggLayersCount: { type: 'long' },
      mapsTotalCount: { type: 'long' },
      timeCaptured: { type: 'date' },
      layerTypes: {
        [TELEMETRY_LAYER_TYPE.EMS_BASEMAP]: {
          min: { type: 'long' },
          max: { type: 'long' },
          avg: { type: 'float' },
          total: { type: 'long' },
        },
        [TELEMETRY_LAYER_TYPE.EMS_REGION]: {
          min: { type: 'long' },
          max: { type: 'long' },
          avg: { type: 'float' },
          total: { type: 'long' },
        },
        [TELEMETRY_LAYER_TYPE.ES_AGG_CLUSTERS]: {
          min: { type: 'long' },
          max: { type: 'long' },
          avg: { type: 'float' },
          total: { type: 'long' },
        },
        [TELEMETRY_LAYER_TYPE.ES_AGG_GRIDS]: {
          min: { type: 'long' },
          max: { type: 'long' },
          avg: { type: 'float' },
          total: { type: 'long' },
        },
        [TELEMETRY_LAYER_TYPE.ES_AGG_HEATMAP]: {
          min: { type: 'long' },
          max: { type: 'long' },
          avg: { type: 'float' },
          total: { type: 'long' },
        },
        [TELEMETRY_LAYER_TYPE.ES_TOP_HITS]: {
          min: { type: 'long' },
          max: { type: 'long' },
          avg: { type: 'float' },
          total: { type: 'long' },
        },
        [TELEMETRY_LAYER_TYPE.ES_DOCS]: {
          min: { type: 'long' },
          max: { type: 'long' },
          avg: { type: 'float' },
          total: { type: 'long' },
        },
        [TELEMETRY_LAYER_TYPE.ES_POINT_TO_POINT]: {
          min: { type: 'long' },
          max: { type: 'long' },
          avg: { type: 'float' },
          total: { type: 'long' },
        },
        [TELEMETRY_LAYER_TYPE.ES_TRACKS]: {
          min: { type: 'long' },
          max: { type: 'long' },
          avg: { type: 'float' },
          total: { type: 'long' },
        },
        [TELEMETRY_LAYER_TYPE.KBN_REGION]: {
          min: { type: 'long' },
          max: { type: 'long' },
          avg: { type: 'float' },
          total: { type: 'long' },
        },
        [TELEMETRY_LAYER_TYPE.KBN_TMS_RASTER]: {
          min: { type: 'long' },
          max: { type: 'long' },
          avg: { type: 'float' },
          total: { type: 'long' },
        },
        [TELEMETRY_LAYER_TYPE.UX_TMS_MVT]: {
          min: { type: 'long' },
          max: { type: 'long' },
          avg: { type: 'float' },
          total: { type: 'long' },
        },
        [TELEMETRY_LAYER_TYPE.UX_TMS_RASTER]: {
          min: { type: 'long' },
          max: { type: 'long' },
          avg: { type: 'float' },
          total: { type: 'long' },
        },
        [TELEMETRY_LAYER_TYPE.UX_WMS]: {
          min: { type: 'long' },
          max: { type: 'long' },
          avg: { type: 'float' },
          total: { type: 'long' },
        },
      },
      scalingOptions: {
        [SCALING_TYPES.LIMIT]: {
          min: { type: 'long' },
          max: { type: 'long' },
          avg: { type: 'float' },
          total: { type: 'long' },
        },
        [SCALING_TYPES.CLUSTERS]: {
          min: { type: 'long' },
          max: { type: 'long' },
          avg: { type: 'float' },
          total: { type: 'long' },
        },
        [SCALING_TYPES.MVT]: {
          min: { type: 'long' },
          max: { type: 'long' },
          avg: { type: 'float' },
          total: { type: 'long' },
        },
      },
      joins: {
        TERM: {
          min: { type: 'long' },
          max: { type: 'long' },
          avg: { type: 'float' },
          total: { type: 'long' },
        },
      },
      basemaps: {
        [TELEMETRY_EMS_BASEMAP_TYPES.AUTO]: {
          min: { type: 'long' },
          max: { type: 'long' },
          avg: { type: 'float' },
          total: { type: 'long' },
        },
        [TELEMETRY_EMS_BASEMAP_TYPES.DARK]: {
          min: { type: 'long' },
          max: { type: 'long' },
          avg: { type: 'float' },
          total: { type: 'long' },
        },
        [TELEMETRY_EMS_BASEMAP_TYPES.ROADMAP]: {
          min: { type: 'long' },
          max: { type: 'long' },
          avg: { type: 'float' },
          total: { type: 'long' },
        },
        [TELEMETRY_EMS_BASEMAP_TYPES.ROADMAP_DESATURATED]: {
          min: { type: 'long' },
          max: { type: 'long' },
          avg: { type: 'float' },
          total: { type: 'long' },
        },
      },
      attributesPerMap: {
        dataSourcesCount: {
          min: { type: 'long' },
          max: { type: 'long' },
          avg: { type: 'float' },
        },
        layersCount: {
          min: { type: 'long' },
          max: { type: 'long' },
          avg: { type: 'float' },
        },
        // TODO: Find out all the possible values for DYNAMIC_KEY or reformat into an array
        layerTypesCount: {
          DYNAMIC_KEY: { min: { type: 'long' }, max: { type: 'long' }, avg: { type: 'float' } },
        },
        emsVectorLayersCount: {
          DYNAMIC_KEY: { min: { type: 'long' }, max: { type: 'long' }, avg: { type: 'float' } },
        },
      },
    },
  });

  usageCollection.registerCollector(mapsUsageCollector);
}
