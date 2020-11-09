/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { MapExtent, VectorSourceRequestMeta } from '../../../../common/descriptor_types';
import { getHttp, getIndexPatternService, getSearchService } from '../../../kibana_services';
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
      requestType: RENDER_AS.HEATMAP,
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
          return `rootdir${path};`;
        },
      },
    });
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
    fieldNames: [],
    buffer: extent,
    sourceQuery: {
      query: '',
      language: 'KQL',
      queryLastTriggeredAt: '2019-04-25T20:53:22.331Z',
    },
    sourceMeta: null,
    zoom: 0,
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

  describe('ITiledSingleLayerVectorSource', () => {
    it('getLayerName', () => {
      expect(geogridSource.getLayerName()).toBe('source_layer');
    });

    it('getMinZoom', () => {
      expect(geogridSource.getMinZoom()).toBe(0);
    });

    it('getMaxZoom', () => {
      expect(geogridSource.getMaxZoom()).toBe(24);
    });

    it('getUrlTemplateWithMeta', async () => {
      const urlTemplateWithMeta = await geogridSource.getUrlTemplateWithMeta(
        vectorSourceRequestMeta
      );

      expect(urlTemplateWithMeta.layerName).toBe('source_layer');
      expect(urlTemplateWithMeta.minSourceZoom).toBe(0);
      expect(urlTemplateWithMeta.maxSourceZoom).toBe(24);
      expect(urlTemplateWithMeta.urlTemplate).toBe(
        "rootdir/api/maps/mvt/getGridTile;?x={x}&y={y}&z={z}&geometryFieldName=bar&index=undefined&requestBody=(foobar:ES_DSL_PLACEHOLDER,params:('0':('0':index,'1':(fields:())),'1':('0':size,'1':0),'2':('0':filter,'1':!((geo_bounding_box:(bar:(bottom_right:!(180,-82.67628),top_left:!(-180,82.67628)))))),'3':('0':query),'4':('0':index,'1':(fields:())),'5':('0':query,'1':(language:KQL,query:'',queryLastTriggeredAt:'2019-04-25T20:53:22.331Z')),'6':('0':aggs,'1':(gridSplit:(aggs:(gridCentroid:(geo_centroid:(field:bar))),geotile_grid:(bounds:!n,field:bar,precision:!n,shard_size:65535,size:65535))))))&requestType=heatmap&geoFieldType=geo_point"
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
