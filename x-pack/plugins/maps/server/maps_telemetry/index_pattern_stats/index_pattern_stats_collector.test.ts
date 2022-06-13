/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { asyncForEach } from '@kbn/std';
// @ts-ignore
import mapSavedObjects from '../test_resources/sample_map_saved_objects.json';
import { DataViewsService } from '@kbn/data-views-plugin/common';
import { IndexPatternStatsCollector } from './index_pattern_stats_collector';

test('returns zeroed telemetry data when there are no saved objects', async () => {
  const mockIndexPatternService = {
    getIds: () => {
      return [];
    },
  } as unknown as DataViewsService;
  const statsCollector = new IndexPatternStatsCollector(mockIndexPatternService);
  const stats = await statsCollector.getStats();
  expect(stats).toEqual({
    geoShapeAggLayersCount: 0,
    indexPatternsWithGeoFieldCount: 0,
    indexPatternsWithGeoPointFieldCount: 0,
    indexPatternsWithGeoShapeFieldCount: 0,
  });
});

test('returns expected telemetry data from saved objects', async () => {
  const mockIndexPatternService = {
    get: (id: string) => {
      if (id === 'd3d7af60-4c81-11e8-b3d7-01146121b73d') {
        return {
          getFieldByName: (name: string) => {
            return { type: 'geo_point' };
          },
          fields: {
            getByType: (type: string) => {
              return type === 'geo_point' ? [{}] : [];
            },
          },
        };
      }

      if (id === '4a7f6010-0aed-11ea-9dd2-95afd7ad44d4') {
        return {
          getFieldByName: (name: string) => {
            return { type: 'geo_shape' };
          },
          fields: {
            getByType: (type: string) => {
              return type === 'geo_shape' ? [{}] : [];
            },
          },
        };
      }

      if (id === 'indexPatternWithNoGeoFields') {
        return {
          getFieldByName: (name: string) => {
            return null;
          },
          fields: {
            getByType: (type: string) => {
              return [];
            },
          },
        };
      }

      throw new Error('Index pattern not found');
    },
    getIds: () => {
      return [
        'd3d7af60-4c81-11e8-b3d7-01146121b73d',
        '4a7f6010-0aed-11ea-9dd2-95afd7ad44d4',
        'indexPatternWithNoGeoFields',
        'missingIndexPattern',
      ];
    },
  } as unknown as DataViewsService;
  const statsCollector = new IndexPatternStatsCollector(mockIndexPatternService);
  await asyncForEach(mapSavedObjects, async (savedObject) => {
    await statsCollector.push(savedObject);
  });
  const stats = await statsCollector.getStats();
  expect(stats).toEqual({
    geoShapeAggLayersCount: 2, // index pattern '4a7f6010-0aed-11ea-9dd2-95afd7ad44d4' with geo_shape field is used in 2 maps with geo_tile_grid aggregation
    indexPatternsWithGeoFieldCount: 2,
    indexPatternsWithGeoPointFieldCount: 1,
    indexPatternsWithGeoShapeFieldCount: 1,
  });
});
