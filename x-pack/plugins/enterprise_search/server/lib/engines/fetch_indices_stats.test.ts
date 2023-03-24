/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { IScopedClusterClient } from '@kbn/core/server';

import { fetchIndicesStats } from './fetch_indices_stats';

describe('fetchIndicesStats lib function', () => {
  const mockClient = {
    asCurrentUser: {
      indices: {
        stats: jest.fn(),
      },
    },
    asInternalUser: {},
  };
  const indicesNames = ['index-name-1', 'index-name-2'];
  const indicesWithStatsResponse = [
    {
      name: 'index-name-1',
      count: 10,
      health: 'GREEN',
    },
    {
      name: 'index-name-2',
      count: 0,
      health: 'unknown',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return hydrated indices', async () => {
    mockClient.asCurrentUser.indices.stats.mockImplementation(() => indicesWithStatsResponse);

    await expect(
      fetchIndicesStats(mockClient as unknown as IScopedClusterClient, indicesNames)
    ).resolves.toEqual({
      indicesWithStatsResponse,
    });

    expect(mockClient.asCurrentUser.indices.stats).toHaveBeenCalledWith({
      index: indicesNames,
      metric: ['docs'],
    });
  });
});
