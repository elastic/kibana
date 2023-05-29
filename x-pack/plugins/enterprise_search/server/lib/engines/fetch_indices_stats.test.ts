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
        stats: jest.fn(),
      },
    },
    asInternalUser: {},
  };
  const indices = ['test-index-name-1', 'test-index-name-2', 'test-index-name-3'];
  const catIndexResponse = [
    {
      health: 'GREEN',
      index: 'test-index-name-1',
      status: 'open',
      uuid: 'YOLLiZ_mSRiDYDk0DJ-p8B',
    },
    {
      health: 'yellow',
      index: 'test-index-name-2',
      status: 'close',
      uuid: 'QOLLiZ_mGRiDYD30D2-p8B',
    },
    {
      health: 'RED',
      index: 'test-index-name-3',
      status: 'open',
      uuid: 'QYLLiZ_fGRiDYD3082-e7',
    },
  ];

  const openIndicesStats = {
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
      'test-index-name-3': {
        health: 'RED',
        primaries: {
          docs: {
            count: 150,
            deleted: 0,
          },
        },
        status: 'open',
        total: {
          docs: {
            count: 300,
            deleted: 0,
          },
        },
        uuid: 'QYLLiZ_fGRiDYD3082-e7',
      },
    },
  };
  const fetchIndicesStatsResponse = [
    {
      count: 200,
      health: 'GREEN',
      name: 'test-index-name-1',
    },
    {
      count: null,
      health: 'unknown',
      name: 'test-index-name-2',
    },
    {
      count: 150,
      health: 'RED',
      name: 'test-index-name-3',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return hydrated indices for all open indices', async () => {
    mockClient.asCurrentUser.indices.exists.mockImplementationOnce(() => true);
    mockClient.asCurrentUser.cat.indices.mockImplementationOnce(() => catIndexResponse);
    mockClient.asCurrentUser.indices.stats.mockImplementationOnce(() => openIndicesStats);

    await expect(
      fetchIndicesStats(mockClient as unknown as IScopedClusterClient, indices)
    ).resolves.toEqual(fetchIndicesStatsResponse);
  });
});
