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
        get: jest.fn(),
        stats: jest.fn(),
      },
      msearch: jest.fn(),
    },
    asInternalUser: {},
  };
  const indices = ['test-index-name-1'];

  const getAllAvailableIndexResponse = {
    'test-index-name-1': { aliases: { test_alias_name: {} } },
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

  const msearchResponse = {
    responses: [
      {
        hits: {
          total: {
            value: 200,
          },
        },
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return hydrated indices for all available and open indices', async () => {
    mockClient.asCurrentUser.indices.get.mockResolvedValueOnce(getAllAvailableIndexResponse);
    mockClient.asCurrentUser.indices.stats.mockResolvedValueOnce(indexStats);
    mockClient.asCurrentUser.msearch.mockImplementationOnce(() => msearchResponse);
    await expect(
      fetchIndicesStats(mockClient as unknown as IScopedClusterClient, indices)
    ).resolves.toEqual(fetchIndicesStatsResponse);
  });

  it('should return count : null, health: unknown for closed index ', async () => {
    mockClient.asCurrentUser.indices.get.mockImplementationOnce(() =>
      Object.assign(getAllAvailableIndexResponse, {
        // test-index-name-2 is the closed index here
        'test-index-name-2': {
          aliases: { test_alias_name: {} },
          settings: { index: { verified_before_close: 'true' } },
        },
      })
    );

    mockClient.asCurrentUser.indices.stats.mockImplementationOnce(() => indexStats);
    mockClient.asCurrentUser.msearch.mockImplementationOnce(() => msearchResponse);

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
  it('should return count : null, health: unknown for deleted index ', async () => {
    mockClient.asCurrentUser.indices.get.mockImplementationOnce(() => getAllAvailableIndexResponse);
    mockClient.asCurrentUser.indices.stats.mockImplementationOnce(() => indexStats);
    mockClient.asCurrentUser.msearch.mockImplementationOnce(() => msearchResponse);

    await expect(
      fetchIndicesStats(mockClient as unknown as IScopedClusterClient, [
        ...indices,
        'test-index-name-3',
      ])
    ).resolves.toEqual([
      ...fetchIndicesStatsResponse,
      {
        count: null,
        health: 'unknown',
        name: 'test-index-name-3',
      },
    ]);
  });
});
