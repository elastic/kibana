/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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
