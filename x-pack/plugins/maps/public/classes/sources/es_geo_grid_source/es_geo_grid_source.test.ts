/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { MapExtent, MapFilters } from '../../../../common/descriptor_types';

jest.mock('../../../kibana_services');
jest.mock('ui/new_platform');

import {
  getIndexPatternService,
  getSearchService,
  fetchSearchSourceAndRecordWithInspector,
} from '../../../kibana_services';
import { ESGeoGridSource } from './es_geo_grid_source';
import {
  ES_GEO_FIELD_TYPE,
  GRID_RESOLUTION,
  RENDER_AS,
  SOURCE_TYPES,
} from '../../../../common/constants';
import { SearchSource } from '../../../../../../../src/plugins/data/public/search/search_source';

export class MockSearchSource {
  setField = jest.fn();
}

describe('ESGeoGridSource', () => {
  const geoFieldName = 'bar';
  const mockIndexPatternService = {
    get() {
      return {
        fields: {
          getByName() {
            return {
              name: geoFieldName,
              type: ES_GEO_FIELD_TYPE.GEO_POINT,
            };
          },
        },
      };
    },
  };
  const geogridSource = new ESGeoGridSource(
    {
      id: 'foobar',
      indexPatternId: 'fooIp',
      geoField: geoFieldName,
      metrics: [],
      resolution: GRID_RESOLUTION.COARSE,
      type: SOURCE_TYPES.ES_GEO_GRID,
      requestType: RENDER_AS.HEATMAP,
    },
    {}
  );

  describe('getGeoJsonWithMeta', () => {
    let mockSearchSource: unknown;
    beforeEach(async () => {
      mockSearchSource = new MockSearchSource();
      const mockSearchService = {
        searchSource: {
          async create() {
            return mockSearchSource as SearchSource;
          },
        },
      };

      // @ts-expect-error
      getIndexPatternService.mockReturnValue(mockIndexPatternService);
      // @ts-expect-error
      getSearchService.mockReturnValue(mockSearchService);
      // @ts-expect-error
      fetchSearchSourceAndRecordWithInspector.mockReturnValue({
        took: 71,
        timed_out: false,
        _shards: {
          total: 1,
          successful: 1,
          skipped: 0,
          failed: 0,
        },
        hits: {
          total: 748 + 683,
          max_score: null,
          hits: [],
        },
        aggregations: {
          gridSplit: {
            buckets: [
              {
                key: '4/4/6',
                doc_count: 748,
                gridCentroid: {
                  location: {
                    lat: 35.64189018148127,
                    lon: -82.84314106196105,
                  },
                  count: 748,
                },
              },
              {
                key: '4/3/6',
                doc_count: 683,
                gridCentroid: {
                  location: {
                    lat: 35.24134021274211,
                    lon: -98.45945192042787,
                  },
                  count: 683,
                },
              },
            ],
          },
        },
      });
    });

    const extent: MapExtent = {
      minLon: -160,
      minLat: -80,
      maxLon: 160,
      maxLat: 80,
    };

    const mapFilters: MapFilters = {
      geogridPrecision: 4,
      filters: [],
      timeFilters: {
        from: 'now',
        to: '15m',
        mode: 'relative',
      },
      // extent,
      buffer: extent,
      zoom: 0,
    };

    it('Should configure the SearchSource correctly', async () => {
      const { data, meta } = await geogridSource.getGeoJsonWithMeta(
        'foobarLayer',
        mapFilters,
        () => {}
      );

      expect(meta && meta.areResultsTrimmed).toEqual(false);
      expect(data).toEqual({
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [-82.84314106196105, 35.64189018148127] },
            id: '4/4/6',
            properties: { doc_count: 748 },
          },
          {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [-98.45945192042787, 35.24134021274211] },
            id: '4/3/6',
            properties: { doc_count: 683 },
          },
        ],
      });

      function getProperty(property: string) {
        // @ts-expect-error
        const call = mockSearchSource.setField.mock.calls.find((c) => {
          return c[0] === property;
        });
        return call[1];
      }

      expect(getProperty('size')).toEqual(0);
      expect(getProperty('query')).toEqual(undefined);
      expect(getProperty('filter')).toEqual([
        {
          geo_bounding_box: { bar: { bottom_right: [180, -82.67628], top_left: [-180, 82.67628] } },
        },
      ]);
      expect(getProperty('aggs')).toEqual({
        gridSplit: {
          aggs: { gridCentroid: { geo_centroid: { field: geoFieldName } } },
          geotile_grid: {
            bounds: { bottom_right: [160, -80], top_left: [-160, 80] },
            field: 'bar',
            precision: 4,
            shard_size: 65535,
            size: 65535,
          },
        },
      });
    });
  });

  describe('getGridResolution', () => {
    it('should echo gridResoltuion', () => {
      expect(geogridSource.getGridResolution()).toBe(GRID_RESOLUTION.COARSE);
    });
  });

  describe('getGeoGridPrecision', () => {
    it('should clamp geo-grid derived zoom to max geotile level supported by ES', () => {
      expect(geogridSource.getGeoGridPrecision(29)).toBe(29);
    });

    it('should use heuristic to derive precision', () => {
      expect(geogridSource.getGeoGridPrecision(10)).toBe(12);
    });
  });
});
