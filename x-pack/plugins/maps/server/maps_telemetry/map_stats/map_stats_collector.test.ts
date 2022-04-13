/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// @ts-ignore
import mapSavedObjects from '../test_resources/sample_map_saved_objects.json';
import { MapStatsCollector } from './map_stats_collector';

test('returns zeroed telemetry data when there are no saved objects', () => {
  const statsCollector = new MapStatsCollector();
  const stats = statsCollector.getStats() as any;
  delete stats.timeCaptured;

  expect(stats).toEqual({
    mapsTotalCount: 0,
    layerTypes: {},
    scalingOptions: {},
    joins: {},
    basemaps: {},
    resolutions: {},
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
  });
});

test('returns expected telemetry data from saved objects', () => {
  const statsCollector = new MapStatsCollector();
  mapSavedObjects.forEach((savedObject) => {
    statsCollector.push(savedObject.attributes);
  });
  const stats = statsCollector.getStats() as any;
  delete stats.timeCaptured;

  expect(stats).toEqual({
    mapsTotalCount: 5,
    layerTypes: {
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
    },
    scalingOptions: {
      limit: {
        avg: 0.2,
        max: 1,
        min: 1,
        total: 1,
      },
    },
    joins: {
      term: {
        avg: 0.2,
        max: 1,
        min: 1,
        total: 1,
      },
    },
    basemaps: {
      roadmap: {
        avg: 0.6,
        max: 1,
        min: 1,
        total: 3,
      },
    },
    resolutions: {
      coarse: {
        avg: 0.6,
        max: 1,
        min: 1,
        total: 3,
      },
    },
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
        GEOJSON_VECTOR: {
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
  });
});
