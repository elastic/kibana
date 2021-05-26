/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import mapSavedObjects from './test_resources/sample_map_saved_objects.json';
import {
  buildMapsIndexPatternsTelemetry,
  buildMapsSavedObjectsTelemetry,
  getLayerLists,
} from './maps_telemetry';

jest.mock('../kibana_server_services', () => {
  // Mocked for geo shape agg detection
  const testAggIndexPatternId = '4a7f6010-0aed-11ea-9dd2-95afd7ad44d4';
  const testAggIndexPattern = {
    id: testAggIndexPatternId,
    fields: [
      {
        name: 'geometry',
        esTypes: ['geo_shape'],
      },
    ],
  };
  const testIndexPatterns = {
    1: {
      id: '1',
      fields: [
        {
          name: 'one',
          esTypes: ['geo_point'],
        },
      ],
    },
    2: {
      id: '2',
      fields: [
        {
          name: 'two',
          esTypes: ['geo_point'],
        },
      ],
    },
    3: {
      id: '3',
      fields: [
        {
          name: 'three',
          esTypes: ['geo_shape'],
        },
      ],
    },
  };
  return {
    getIndexPatternsService() {
      return {
        async get(x) {
          return x === testAggIndexPatternId ? testAggIndexPattern : testIndexPatterns[x];
        },
        async getIds() {
          return Object.values(testIndexPatterns).map((x) => x.id);
        },
        async getFieldsForIndexPattern(x) {
          return x.fields;
        },
      };
    },
  };
});

describe('buildMapsSavedObjectsTelemetry', () => {
  test('returns zeroed telemetry data when there are no saved objects', async () => {
    const result = buildMapsSavedObjectsTelemetry([]);

    expect(result.layerTypes).toEqual({});
    expect(result.scalingOptions).toEqual({});
    expect(result.joins).toEqual({});
    expect(result.basemaps).toEqual({});
    expect(result.attributesPerMap).toEqual({
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
    });
    expect(result.mapsTotalCount).toEqual(0);
    expect(new Date(Date.parse(result.timeCaptured)).toISOString()).toEqual(result.timeCaptured);
  });

  test('returns expected telemetry data from saved objects', async () => {
    const layerLists = getLayerLists(mapSavedObjects);
    const result = buildMapsSavedObjectsTelemetry(layerLists);

    expect(result.layerTypes).toEqual({
      ems_basemap: {
        avg: 0.6,
        max: 1,
        min: 1,
        total: 3,
      },
      ems_region: {
        avg: 0.6,
        max: 1,
        min: 1,
        total: 3,
      },
      es_agg_clusters: {
        avg: 0.4,
        max: 1,
        min: 1,
        total: 2,
      },
      es_agg_heatmap: {
        avg: 0.2,
        max: 1,
        min: 1,
        total: 1,
      },
      es_docs: {
        avg: 0.2,
        max: 1,
        min: 1,
        total: 1,
      },
    });
    expect(result.scalingOptions).toEqual({
      limit: {
        avg: 0.2,
        max: 1,
        min: 1,
        total: 1,
      },
    });
    expect(result.joins).toEqual({
      term: {
        avg: 0.2,
        max: 1,
        min: 1,
        total: 1,
      },
    });
    expect(result.basemaps).toEqual({
      roadmap: {
        avg: 0.6,
        max: 1,
        min: 1,
        total: 3,
      },
    });
    expect(result.attributesPerMap).toEqual({
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
        HEATMAP: {
          avg: 0.2,
          max: 1,
          min: 1,
        },
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
    });
    expect(result.mapsTotalCount).toEqual(5);
    expect(new Date(Date.parse(result.timeCaptured)).toISOString()).toEqual(result.timeCaptured);
  });

  test('returns expected telemetry data from index patterns', async () => {
    const layerLists = getLayerLists(mapSavedObjects);
    const result = await buildMapsIndexPatternsTelemetry(layerLists);

    expect(result).toMatchObject({
      indexPatternsWithGeoFieldCount: 3,
      indexPatternsWithGeoPointFieldCount: 2,
      indexPatternsWithGeoShapeFieldCount: 1,
      geoShapeAggLayersCount: 2,
    });
  });
});
