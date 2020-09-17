/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getTile } from './get_tile';
import { TILE_SEARCHES } from './__tests__/tile_searches';
import { Logger } from 'src/core/server';
import * as path from 'path';
import * as fs from 'fs';

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
    });

    if (tile === null) {
      throw new Error('Tile should be created');
    }

    const expectedPath = path.resolve(__dirname, './__tests__/pbf/0_0_0.pbf');
    const expectedBin = fs.readFileSync(expectedPath, 'binary');
    const expectedTile = Buffer.from(expectedBin, 'binary');
    expect(expectedTile.equals(tile)).toBe(true);
  });
});
