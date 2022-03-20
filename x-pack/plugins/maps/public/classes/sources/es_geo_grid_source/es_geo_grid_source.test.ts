/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '../../../../../../../src/core/public/mocks';
import { MapExtent, VectorSourceRequestMeta } from '../../../../common/descriptor_types';
import {
  getExecutionContext,
  getHttp,
  getIndexPatternService,
  getSearchService,
} from '../../../kibana_services';
import { ESGeoGridSource } from './es_geo_grid_source';
import {
  ES_GEO_FIELD_TYPE,
  GRID_RESOLUTION,
  RENDER_AS,
  SOURCE_TYPES,
} from '../../../../common/constants';
import { SearchSource } from 'src/plugins/data/public';
import { LICENSED_FEATURES } from '../../../licensed_features';

jest.mock('../../../kibana_services');

export class MockSearchSource {
  setField = jest.fn();
  setParent() {}
  getSearchRequestBody() {
    return { foobar: 'ES_DSL_PLACEHOLDER', params: this.setField.mock.calls };
  }
}

describe('ESGeoGridSource', () => {
  const geoFieldName = 'bar';

  let esGeoFieldType = ES_GEO_FIELD_TYPE.GEO_POINT;
  const mockIndexPatternService = {
    get() {
      return {
        fields: {
          getByName() {
            return {
              name: geoFieldName,
              type: esGeoFieldType,
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
      requestType: RENDER_AS.POINT,
    },
    {}
  );
  geogridSource._runEsQuery = async (args: unknown) => {
    return {
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
    };
  };

  let mockSearchSource: unknown;
  beforeEach(async () => {
    mockSearchSource = new MockSearchSource();
    const mockSearchService = {
      searchSource: {
        async create() {
          return mockSearchSource as SearchSource;
        },
        createEmpty() {
          return mockSearchSource as SearchSource;
        },
      },
    };

    // @ts-expect-error
    getIndexPatternService.mockReturnValue(mockIndexPatternService);
    // @ts-expect-error
    getSearchService.mockReturnValue(mockSearchService);
    // @ts-expect-error
    getHttp.mockReturnValue({
      basePath: {
        prepend(path: string) {
          return `rootdir${path}`;
        },
      },
    });

    const coreStartMock = coreMock.createStart();
    coreStartMock.executionContext.get.mockReturnValue({
      name: 'some-app',
    });
    // @ts-expect-error
    getExecutionContext.mockReturnValue(coreStartMock.executionContext);
  });

  afterEach(() => {
    esGeoFieldType = ES_GEO_FIELD_TYPE.GEO_POINT;
    jest.resetAllMocks();
  });

  const extent: MapExtent = {
    minLon: -160,
    minLat: -80,
    maxLon: 160,
    maxLat: 80,
  };

  const vectorSourceRequestMeta: VectorSourceRequestMeta = {
    isReadOnly: false,
    geogridPrecision: 4,
    filters: [],
    timeFilters: {
      from: 'now',
      to: '15m',
      mode: 'relative',
    },
    extent,
    applyGlobalQuery: true,
    applyGlobalTime: true,
    applyForceRefresh: true,
    fieldNames: [],
    buffer: extent,
    sourceQuery: {
      query: '',
      language: 'KQL',
    },
    sourceMeta: null,
    zoom: 0,
    isForceRefresh: false,
  };

  describe('getGeoJsonWithMeta', () => {
    it('Should configure the SearchSource correctly', async () => {
      const { data, meta } = await geogridSource.getGeoJsonWithMeta(
        'foobarLayer',
        vectorSourceRequestMeta,
        () => {},
        () => true
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
          meta: {
            alias: null,
            disabled: false,
            key: 'bar',
            negate: false,
          },
          query: {
            bool: {
              must: [
                {
                  exists: {
                    field: 'bar',
                  },
                },
                {
                  geo_bounding_box: {
                    bar: {
                      top_left: [-180, 82.67628],
                      bottom_right: [180, -82.67628],
                    },
                  },
                },
              ],
            },
          },
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

    it('Should not return valid precision for super-fine resolution', () => {
      const superFineSource = new ESGeoGridSource(
        {
          id: 'foobar',
          indexPatternId: 'fooIp',
          geoField: geoFieldName,
          metrics: [],
          resolution: GRID_RESOLUTION.SUPER_FINE,
          type: SOURCE_TYPES.ES_GEO_GRID,
          requestType: RENDER_AS.HEATMAP,
        },
        {}
      );
      expect(superFineSource.getGeoGridPrecision(10)).toBe(NaN);
    });
  });

  describe('IMvtVectorSource', () => {
    const mvtGeogridSource = new ESGeoGridSource(
      {
        id: 'foobar',
        indexPatternId: 'fooIp',
        geoField: geoFieldName,
        metrics: [],
        resolution: GRID_RESOLUTION.SUPER_FINE,
        type: SOURCE_TYPES.ES_GEO_GRID,
        requestType: RENDER_AS.HEATMAP,
      },
      {}
    );

    it('getTileSourceLayer', () => {
      expect(mvtGeogridSource.getTileSourceLayer()).toBe('aggs');
    });

    it('getTileUrl', async () => {
      const tileUrl = await mvtGeogridSource.getTileUrl(vectorSourceRequestMeta, '1234');

      expect(tileUrl).toEqual(
        "rootdir/api/maps/mvt/getGridTile/{z}/{x}/{y}.pbf?geometryFieldName=bar&index=undefined&gridPrecision=8&requestBody=(foobar%3AES_DSL_PLACEHOLDER%2Cparams%3A('0'%3A('0'%3Aindex%2C'1'%3A(fields%3A()))%2C'1'%3A('0'%3Asize%2C'1'%3A0)%2C'2'%3A('0'%3Afilter%2C'1'%3A!())%2C'3'%3A('0'%3Aquery)%2C'4'%3A('0'%3Aindex%2C'1'%3A(fields%3A()))%2C'5'%3A('0'%3Aquery%2C'1'%3A(language%3AKQL%2Cquery%3A''))%2C'6'%3A('0'%3Aaggs%2C'1'%3A())))&requestType=point&token=1234"
      );
    });
  });

  describe('Gold+ usage', () => {
    it('Should have none for points', async () => {
      expect(await geogridSource.getLicensedFeatures()).toEqual([]);
    });

    it('Should have shape-aggs for geo_shape', async () => {
      esGeoFieldType = ES_GEO_FIELD_TYPE.GEO_SHAPE;
      expect(await geogridSource.getLicensedFeatures()).toEqual([
        LICENSED_FEATURES.GEO_SHAPE_AGGS_GEO_TILE,
      ]);
    });
  });
});
