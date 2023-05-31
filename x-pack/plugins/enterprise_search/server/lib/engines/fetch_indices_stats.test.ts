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
      cat: {
        indices: jest.fn(),
      },
      indices: {
        exists: jest.fn(),
        get: jest.fn(),
        stats: jest.fn(),
      },
    },
    asInternalUser: {},
  };
  const indices = ['test-index-name-1'];

  const getIndexResponse = {
    'test-index-name-1': { settings: { index: { verified_before_close: 'true' } } },
  };

  const indexStats = {
    indices: {
      'test-index-name-1': {
        health: 'GREEN',
        primaries: {
          docs: {
            count: 200,
            deleted: 0,
          },
        },
        status: 'open',
        total: {
          docs: {
            count: 400,
            deleted: 0,
          },
        },
        uuid: 'YOLLiZ_mSRiDYDk0DJ-p8B',
      },
    },
  };
  const fetchIndicesStatsResponse = [
    {
      count: 200,
      health: 'GREEN',
      name: 'test-index-name-1',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return hydrated indices for all available and open indices', async () => {
    mockClient.asCurrentUser.indices.exists.mockImplementationOnce(() => true);
    mockClient.asCurrentUser.indices.get.mockImplementationOnce(() => getIndexResponse);
    mockClient.asCurrentUser.indices.stats.mockImplementationOnce(() => indexStats);

    await expect(
      fetchIndicesStats(mockClient as unknown as IScopedClusterClient, indices)
    ).resolves.toEqual(fetchIndicesStatsResponse);
  });


  it('should return count : null, health: unknown for deleted or closed index ', async () => {
    mockClient.asCurrentUser.indices.exists.mockImplementationOnce(() => true);
    mockClient.asCurrentUser.indices.get.mockImplementationOnce(() => getIndexResponse);
    mockClient.asCurrentUser.indices.stats.mockImplementationOnce(() => indexStats);

    await expect(
      fetchIndicesStats(mockClient as unknown as IScopedClusterClient, [
        ...indices,
        'test-index-name-2',
      ])
    ).resolves.toEqual([
      ...fetchIndicesStatsResponse,
      {
        count: null,
        health: 'unknown',
        name: 'test-index-name-2',
      },
    ]);
  });
});
