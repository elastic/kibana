/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { getMapsTelemetry, MapsUsage } from '../maps_telemetry';
import { MapsConfigType } from '../../../config';

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
        ems_basemap: {
          min: { type: 'long' },
          max: { type: 'long' },
          avg: { type: 'float' },
          total: { type: 'long' },
        },
        ems_region: {
          min: { type: 'long' },
          max: { type: 'long' },
          avg: { type: 'float' },
          total: { type: 'long' },
        },
        es_agg_clusters: {
          min: { type: 'long' },
          max: { type: 'long' },
          avg: { type: 'float' },
          total: { type: 'long' },
        },
        es_agg_grids: {
          min: { type: 'long' },
          max: { type: 'long' },
          avg: { type: 'float' },
          total: { type: 'long' },
        },
        es_agg_heatmap: {
          min: { type: 'long' },
          max: { type: 'long' },
          avg: { type: 'float' },
          total: { type: 'long' },
        },
        es_top_hits: {
          min: { type: 'long' },
          max: { type: 'long' },
          avg: { type: 'float' },
          total: { type: 'long' },
        },
        es_docs: {
          min: { type: 'long' },
          max: { type: 'long' },
          avg: { type: 'float' },
          total: { type: 'long' },
        },
        es_point_to_point: {
          min: { type: 'long' },
          max: { type: 'long' },
          avg: { type: 'float' },
          total: { type: 'long' },
        },
        es_tracks: {
          min: { type: 'long' },
          max: { type: 'long' },
          avg: { type: 'float' },
          total: { type: 'long' },
        },
        kbn_region: {
          min: { type: 'long' },
          max: { type: 'long' },
          avg: { type: 'float' },
          total: { type: 'long' },
        },
        kbn_tms_raster: {
          min: { type: 'long' },
          max: { type: 'long' },
          avg: { type: 'float' },
          total: { type: 'long' },
        },
        ux_tms_mvt: {
          min: { type: 'long' },
          max: { type: 'long' },
          avg: { type: 'float' },
          total: { type: 'long' },
        },
        ux_tms_raster: {
          min: { type: 'long' },
          max: { type: 'long' },
          avg: { type: 'float' },
          total: { type: 'long' },
        },
        ux_wms: {
          min: { type: 'long' },
          max: { type: 'long' },
          avg: { type: 'float' },
          total: { type: 'long' },
        },
      },
      scalingOptions: {
        limit: {
          min: { type: 'long' },
          max: { type: 'long' },
          avg: { type: 'float' },
          total: { type: 'long' },
        },
        clusters: {
          min: { type: 'long' },
          max: { type: 'long' },
          avg: { type: 'float' },
          total: { type: 'long' },
        },
        mvt: {
          min: { type: 'long' },
          max: { type: 'long' },
          avg: { type: 'float' },
          total: { type: 'long' },
        },
      },
      joins: {
        term: {
          min: { type: 'long' },
          max: { type: 'long' },
          avg: { type: 'float' },
          total: { type: 'long' },
        },
      },
      basemaps: {
        auto: {
          min: { type: 'long' },
          max: { type: 'long' },
          avg: { type: 'float' },
          total: { type: 'long' },
        },
        dark: {
          min: { type: 'long' },
          max: { type: 'long' },
          avg: { type: 'float' },
          total: { type: 'long' },
        },
        roadmap: {
          min: { type: 'long' },
          max: { type: 'long' },
          avg: { type: 'float' },
          total: { type: 'long' },
        },
        roadmap_desaturated: {
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
