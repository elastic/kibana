/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import mapSavedObjects from './test_resources/sample_map_saved_objects.json';
import indexPatternSavedObjects from './test_resources/sample_index_pattern_saved_objects';
import {
  buildMapsIndexPatternsTelemetry,
  buildMapsSavedObjectsTelemetry,
  getLayerLists,
} from './maps_telemetry';

describe('buildMapsSavedObjectsTelemetry', () => {
  test('returns zeroed telemetry data when there are no saved objects', async () => {
    const result = buildMapsSavedObjectsTelemetry([]);

    expect(result).toMatchObject({
      attributesPerMap: {
        dataSourcesCount: {
          avg: 0,
          max: 0,
          min: 0,
        },
        emsVectorLayersCount: {},
        layerTypesCount: {},
        layersCount: {
          avg: 0,
          max: 0,
          min: 0,
        },
      },
      mapsTotalCount: 0,
    });
  });

  test('returns expected telemetry data from saved objects', async () => {
    const layerLists = getLayerLists(mapSavedObjects);
    const result = buildMapsSavedObjectsTelemetry(layerLists);

    expect(result).toMatchObject({
      attributesPerMap: {
        dataSourcesCount: {
          avg: 2,
          max: 3,
          min: 1,
        },
        emsVectorLayersCount: {
          canada_provinces: {
            avg: 0.2,
            max: 1,
            min: 1,
          },
          france_departments: {
            avg: 0.2,
            max: 1,
            min: 1,
          },
          italy_provinces: {
            avg: 0.2,
            max: 1,
            min: 1,
          },
        },
        layerTypesCount: {
          TILE: {
            avg: 0.6,
            max: 1,
            min: 1,
          },
          VECTOR: {
            avg: 1.2,
            max: 2,
            min: 1,
          },
        },
        layersCount: {
          avg: 2,
          max: 3,
          min: 1,
        },
      },
      mapsTotalCount: 5,
    });
  });

  test('returns expected telemetry data from index patterns', async () => {
    const layerLists = getLayerLists(mapSavedObjects);
    const result = buildMapsIndexPatternsTelemetry(indexPatternSavedObjects, layerLists);

    expect(result).toMatchObject({
      indexPatternsWithGeoFieldCount: 3,
      indexPatternsWithGeoPointFieldCount: 2,
      indexPatternsWithGeoShapeFieldCount: 1,
      geoShapeAggLayersCount: 2,
    });
  });
});
