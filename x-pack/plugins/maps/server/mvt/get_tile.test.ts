/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getGridTile, getTile } from './get_tile';
import { TILE_GRIDAGGS, TILE_SEARCHES } from './__tests__/tile_es_responses';
import { Logger } from 'src/core/server';
import {
  ES_GEO_FIELD_TYPE,
  KBN_IS_CENTROID_FEATURE,
  MVT_SOURCE_LAYER_NAME,
  RENDER_AS,
} from '../../common/constants';

// @ts-expect-error
import { VectorTile, VectorTileLayer } from '@mapbox/vector-tile';
// @ts-expect-error
import Protobuf from 'pbf';

interface ITileLayerJsonExpectation {
  version: number;
  name: string;
  extent: number;
  features: Array<{
    id: string | number | undefined;
    type: number;
    properties: object;
    extent: number;
    pointArrays: object;
  }>;
}

describe('getTile', () => {
  const mockCallElasticsearch = jest.fn();

  const requestBody = {
    _source: { excludes: [] },
    docvalue_fields: [],
    query: { bool: { filter: [{ match_all: {} }], must: [], must_not: [], should: [] } },
    script_fields: {},
    size: 10000,
    stored_fields: ['*'],
  };
  const geometryFieldName = 'coordinates';

  beforeEach(() => {
    mockCallElasticsearch.mockReset();
  });

  test('0.0.0 - under limit', async () => {
    mockCallElasticsearch.mockImplementation((type) => {
      if (type === 'count') {
        return TILE_SEARCHES['0.0.0'].countResponse;
      } else if (type === 'search') {
        return TILE_SEARCHES['0.0.0'].searchResponse;
      } else {
        throw new Error(`${type} not recognized`);
      }
    });

    const pbfTile = await getTile({
      x: 0,
      y: 0,
      z: 0,
      index: 'world_countries',
      requestBody,
      geometryFieldName,
      logger: ({
        info: () => {},
      } as unknown) as Logger,
      callElasticsearch: mockCallElasticsearch,
      geoFieldType: ES_GEO_FIELD_TYPE.GEO_SHAPE,
    });

    const jsonTile = new VectorTile(new Protobuf(pbfTile));
    compareJsonTiles(jsonTile, {
      version: 2,
      name: 'source_layer',
      extent: 4096,
      features: [
        {
          id: undefined,
          type: 3,
          properties: {
            __kbn__feature_id__: 'poly:G7PRMXQBgyyZ-h5iYibj:0',
            _id: 'G7PRMXQBgyyZ-h5iYibj',
            _index: 'poly',
          },
          extent: 4096,
          pointArrays: [
            [
              { x: 840, y: 1600 },
              { x: 1288, y: 1096 },
              { x: 1672, y: 1104 },
              { x: 2104, y: 1508 },
              { x: 1472, y: 2316 },
              { x: 840, y: 1600 },
            ],
          ],
        },
        {
          id: undefined,
          type: 1,
          properties: {
            __kbn__feature_id__: 'poly:G7PRMXQBgyyZ-h5iYibj:0',
            _id: 'G7PRMXQBgyyZ-h5iYibj',
            _index: 'poly',
            [KBN_IS_CENTROID_FEATURE]: true,
          },
          extent: 4096,
          pointArrays: [[{ x: 1470, y: 1702 }]],
        },
      ],
    });
  });
});

describe('getGridTile', () => {
  const mockCallElasticsearch = jest.fn();

  const geometryFieldName = 'geometry';

  // For mock-purposes only. The ES-call response is mocked in 0_0_0_gridagg.json file
  const requestBody = {
    _source: { excludes: [] },
    aggs: {
      gridSplit: {
        aggs: {
          // eslint-disable-next-line @typescript-eslint/naming-convention
          avg_of_TOTAL_AV: { avg: { field: 'TOTAL_AV' } },
          gridCentroid: { geo_centroid: { field: geometryFieldName } },
        },
        geotile_grid: {
          bounds: null,
          field: geometryFieldName,
          precision: null,
          shard_size: 65535,
          size: 65535,
        },
      },
    },
    docvalue_fields: [],
    query: {
      bool: {
        filter: [],
      },
    },
    script_fields: {},
    size: 0,
    stored_fields: ['*'],
  };

  beforeEach(() => {
    mockCallElasticsearch.mockReset();
    mockCallElasticsearch.mockImplementation((type) => {
      return TILE_GRIDAGGS['0.0.0'].gridAggResponse;
    });
  });

  const defaultParams = {
    x: 0,
    y: 0,
    z: 0,
    index: 'manhattan',
    requestBody,
    geometryFieldName,
    logger: ({
      info: () => {},
    } as unknown) as Logger,
    callElasticsearch: mockCallElasticsearch,
    requestType: RENDER_AS.POINT,
    geoFieldType: ES_GEO_FIELD_TYPE.GEO_POINT,
  };

  test('0.0.0 tile (clusters)', async () => {
    const pbfTile = await getGridTile(defaultParams);
    const jsonTile = new VectorTile(new Protobuf(pbfTile));
    compareJsonTiles(jsonTile, {
      version: 2,
      name: 'source_layer',
      extent: 4096,
      features: [
        {
          id: undefined,
          type: 1,
          properties: {
            ['avg_of_TOTAL_AV']: 5398920.390458991,
            doc_count: 42637,
          },
          extent: 4096,
          pointArrays: [[{ x: 1206, y: 1539 }]],
        },
      ],
    });
  });

  test('0.0.0 tile (grids)', async () => {
    const pbfTile = await getGridTile({ ...defaultParams, requestType: RENDER_AS.GRID });
    const jsonTile = new VectorTile(new Protobuf(pbfTile));
    compareJsonTiles(jsonTile, {
      version: 2,
      name: 'source_layer',
      extent: 4096,
      features: [
        {
          id: undefined,
          type: 3,
          properties: {
            ['avg_of_TOTAL_AV']: 5398920.390458991,
            doc_count: 42637,
          },
          extent: 4096,
          pointArrays: [
            [
              { x: 1216, y: 1536 },
              { x: 1216, y: 1568 },
              { x: 1184, y: 1568 },
              { x: 1184, y: 1536 },
              { x: 1216, y: 1536 },
            ],
          ],
        },
        {
          id: undefined,
          type: 1,
          properties: {
            ['avg_of_TOTAL_AV']: 5398920.390458991,
            doc_count: 42637,
            [KBN_IS_CENTROID_FEATURE]: true,
          },
          extent: 4096,
          pointArrays: [[{ x: 1200, y: 1552 }]],
        },
      ],
    });
  });
});

/**
 * Verifies JSON-representation of tile-contents
 * @param actualTileJson
 * @param expectedLayer
 */
function compareJsonTiles(actualTileJson: VectorTile, expectedLayer: ITileLayerJsonExpectation) {
  const actualLayer: VectorTileLayer = actualTileJson.layers[MVT_SOURCE_LAYER_NAME];
  expect(actualLayer.version).toEqual(expectedLayer.version);
  expect(actualLayer.extent).toEqual(expectedLayer.extent);
  expect(actualLayer.name).toEqual(expectedLayer.name);
  expect(actualLayer.length).toEqual(expectedLayer.features.length);

  expectedLayer.features.forEach((expectedFeature, index) => {
    const actualFeature = actualLayer.feature(index);
    expect(actualFeature.type).toEqual(expectedFeature.type);
    expect(actualFeature.extent).toEqual(expectedFeature.extent);
    expect(actualFeature.id).toEqual(expectedFeature.id);
    expect(actualFeature.properties).toEqual(expectedFeature.properties);
    expect(actualFeature.loadGeometry()).toEqual(expectedFeature.pointArrays);
  });
}
