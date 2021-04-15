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

  const clusterStats = {
    min: { type: 'long' },
    max: { type: 'long' },
    avg: { type: 'float' },
    total: { type: 'long' },
  };

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
        [TELEMETRY_LAYER_TYPE.EMS_BASEMAP]: clusterStats,
        [TELEMETRY_LAYER_TYPE.EMS_REGION]: clusterStats,
        [TELEMETRY_LAYER_TYPE.ES_AGG_CLUSTERS]: clusterStats,
        [TELEMETRY_LAYER_TYPE.ES_AGG_GRIDS]: clusterStats,
        [TELEMETRY_LAYER_TYPE.ES_AGG_HEATMAP]: clusterStats,
        [TELEMETRY_LAYER_TYPE.ES_TOP_HITS]: clusterStats,
        [TELEMETRY_LAYER_TYPE.ES_DOCS]: clusterStats,
        [TELEMETRY_LAYER_TYPE.ES_POINT_TO_POINT]: clusterStats,
        [TELEMETRY_LAYER_TYPE.ES_TRACKS]: clusterStats,
        [TELEMETRY_LAYER_TYPE.KBN_REGION]: clusterStats,
        [TELEMETRY_LAYER_TYPE.KBN_TMS_RASTER]: clusterStats,
        [TELEMETRY_LAYER_TYPE.UX_TMS_MVT]: clusterStats,
        [TELEMETRY_LAYER_TYPE.UX_TMS_RASTER]: clusterStats,
        [TELEMETRY_LAYER_TYPE.UX_WMS]: clusterStats,
      },
      scalingOptions: {
        [SCALING_TYPES.LIMIT]: clusterStats,
        [SCALING_TYPES.CLUSTERS]: clusterStats,
        [SCALING_TYPES.MVT]: clusterStats,
      },
      joins: {
        TERM: clusterStats,
      },
      basemaps: {
        [TELEMETRY_EMS_BASEMAP_TYPES.AUTO]: clusterStats,
        [TELEMETRY_EMS_BASEMAP_TYPES.DARK]: clusterStats,
        [TELEMETRY_EMS_BASEMAP_TYPES.ROADMAP]: clusterStats,
        [TELEMETRY_EMS_BASEMAP_TYPES.ROADMAP_DESATURATED]: clusterStats,
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
