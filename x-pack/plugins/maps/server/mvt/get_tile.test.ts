/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getGridTile, getTile } from './get_tile';
import { TILE_GRIDAGGS, TILE_SEARCHES } from './__tests__/tile_es_responses';
import { Logger } from 'src/core/server';
import * as path from 'path';
import * as fs from 'fs';
import { ES_GEO_FIELD_TYPE, RENDER_AS } from '../../common/constants';

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

    const tile = await getTile({
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

    compareTiles('./__tests__/pbf/0_0_0_docs.pbf', tile);
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
    const tile = await getGridTile(defaultParams);
    compareTiles('./__tests__/pbf/0_0_0_grid_aspoint.pbf', tile);
  });

  test('0.0.0 tile (grids)', async () => {
    const tile = await getGridTile({ ...defaultParams, requestType: RENDER_AS.GRID });
    compareTiles('./__tests__/pbf/0_0_0_grid_asgrid.pbf', tile);
  });
});

function compareTiles(expectedRelativePath: string, actualTile: Buffer | null) {
  if (actualTile === null) {
    throw new Error('Tile should be created');
  }
  const expectedPath = path.resolve(__dirname, expectedRelativePath);
  const expectedBin = fs.readFileSync(expectedPath, 'binary');
  const expectedTile = Buffer.from(expectedBin, 'binary');
  expect(expectedTile.equals(actualTile)).toBe(true);
}
