/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';

import { mockLogger } from '../__mocks__';
import { MOCK_GET_INDICES_RESPONSES, MOCK_INDICES_STATS_RESPONSES } from '../__mocks__/indices';

import { fetchIndices } from './fetch_indices';

describe('fetch indices lib', () => {
  const mockClient = {
    count: jest.fn(),
    indices: {
      get: jest.fn(),
      stats: jest.fn(),
    },
  };
  const client = mockClient as unknown as ElasticsearchClient;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient.count.mockResolvedValue({ count: 100 });
  });

  it('should return indices without aliases', async () => {
    mockClient.indices.get.mockResolvedValue(MOCK_GET_INDICES_RESPONSES.regular);
    mockClient.indices.stats.mockResolvedValue(MOCK_INDICES_STATS_RESPONSES.regular);

    await expect(
      fetchIndices(undefined, 5, { client, hasIndexStats: true, logger: mockLogger })
    ).resolves.toStrictEqual({
      indices: [
        {
          aliases: [],
          count: 100,
          health: 'green',
          name: 'unit-test-index',
          status: 'open',
        },
      ],
    });

    expect(mockClient.indices.get).toHaveBeenCalledTimes(1);
    expect(mockClient.indices.get).toHaveBeenCalledWith({
      expand_wildcards: ['open'],
      features: ['aliases', 'settings'],
      filter_path: [
        '*.aliases',
        '*.settings.index.hidden',
        '*.settings.index.verified_before_close',
      ],
      index: '*',
    });
    expect(mockClient.indices.stats).toHaveBeenCalledTimes(1);
    expect(mockClient.indices.stats).toHaveBeenCalledWith({
      index: ['unit-test-index'],
      metric: ['docs', 'store'],
    });
    expect(mockClient.count).toHaveBeenCalledTimes(1);
    expect(mockClient.count).toHaveBeenCalledWith({ index: 'unit-test-index' });
  });
  it('should return indices stats when enabled', async () => {
    mockClient.indices.get.mockResolvedValue(MOCK_GET_INDICES_RESPONSES.manyResults);
    mockClient.indices.stats.mockResolvedValue(MOCK_INDICES_STATS_RESPONSES.manyResults);

    await expect(
      fetchIndices(undefined, 5, { client, hasIndexStats: true, logger: mockLogger })
    ).resolves.toStrictEqual({
      indices: [
        {
          aliases: [],
          count: 100,
          health: 'green',
          name: 'unit-test-index-001',
          status: 'open',
        },
        {
          aliases: [],
          count: 100,
          health: 'yellow',
          name: 'unit-test-index-002',
          status: 'open',
        },
        {
          aliases: [],
          count: 100,
          health: 'green',
          name: 'unit-test-index-003',
          status: 'open',
        },
        {
          aliases: [],
          count: 100,
          health: 'green',
          name: 'unit-test-index-004',
          status: 'open',
        },
        {
          aliases: [],
          count: 100,
          health: 'RED',
          name: 'unit-test-index-005',
          status: 'open',
        },
      ],
    });

    expect(mockClient.indices.get).toHaveBeenCalledTimes(1);
    expect(mockClient.indices.stats).toHaveBeenCalledTimes(1);
    expect(mockClient.indices.stats).toHaveBeenCalledWith({
      index: [
        'unit-test-index-001',
        'unit-test-index-002',
        'unit-test-index-003',
        'unit-test-index-004',
        'unit-test-index-005',
      ],
      metric: ['docs', 'store'],
    });
  });
  it('should not return indices stats when disabled', async () => {
    mockClient.indices.get.mockResolvedValue(MOCK_GET_INDICES_RESPONSES.regular);

    await expect(
      fetchIndices(undefined, 5, { client, hasIndexStats: false, logger: mockLogger })
    ).resolves.toStrictEqual({
      indices: [
        {
          aliases: [],
          count: 100,
          name: 'unit-test-index',
        },
      ],
    });

    expect(mockClient.indices.stats).toHaveBeenCalledTimes(0);
  });
  it('should return indices with aliases', async () => {
    mockClient.indices.get.mockResolvedValue(MOCK_GET_INDICES_RESPONSES.withAlias);

    await expect(
      fetchIndices(undefined, 5, { client, hasIndexStats: false, logger: mockLogger })
    ).resolves.toStrictEqual({
      indices: [
        {
          aliases: ['test-alias'],
          count: 100,
          name: 'unit-test-index',
        },
      ],
    });
  });
  it('should not return indices with hidden aliases', async () => {
    mockClient.indices.get.mockResolvedValue(MOCK_GET_INDICES_RESPONSES.withHiddenAlias);

    await expect(
      fetchIndices(undefined, 5, { client, hasIndexStats: false, logger: mockLogger })
    ).resolves.toStrictEqual({
      indices: [
        {
          aliases: [],
          count: 100,
          name: 'unit-test-index',
        },
      ],
    });
  });
  it('should return indices counts', async () => {
    mockClient.indices.get.mockResolvedValue(MOCK_GET_INDICES_RESPONSES.manyResults);

    await expect(
      fetchIndices(undefined, 5, { client, hasIndexStats: false, logger: mockLogger })
    ).resolves.toStrictEqual({
      indices: [
        {
          aliases: [],
          count: 100,
          name: 'unit-test-index-001',
        },
        {
          aliases: [],
          count: 100,
          name: 'unit-test-index-002',
        },
        {
          aliases: [],
          count: 100,
          name: 'unit-test-index-003',
        },
        {
          aliases: [],
          count: 100,
          name: 'unit-test-index-004',
        },
        {
          aliases: [],
          count: 100,
          name: 'unit-test-index-005',
        },
      ],
    });

    expect(mockClient.indices.get).toHaveBeenCalledTimes(1);
    expect(mockClient.count).toHaveBeenCalledTimes(5);
    expect(mockClient.count.mock.calls).toEqual([
      [{ index: 'unit-test-index-001' }],
      [{ index: 'unit-test-index-002' }],
      [{ index: 'unit-test-index-003' }],
      [{ index: 'unit-test-index-004' }],
      [{ index: 'unit-test-index-005' }],
    ]);
  });
  it('should use search query when given', async () => {
    mockClient.indices.get.mockResolvedValue(MOCK_GET_INDICES_RESPONSES.regular);

    await expect(
      fetchIndices('test', 5, { client, hasIndexStats: false, logger: mockLogger })
    ).resolves.toStrictEqual({
      indices: [
        {
          aliases: [],
          count: 100,
          name: 'unit-test-index',
        },
      ],
    });

    expect(mockClient.indices.get).toHaveBeenCalledTimes(1);
    expect(mockClient.indices.get).toHaveBeenCalledWith({
      expand_wildcards: ['open'],
      features: ['aliases', 'settings'],
      filter_path: [
        '*.aliases',
        '*.settings.index.hidden',
        '*.settings.index.verified_before_close',
      ],
      index: '*test*',
    });
  });
  it('should exclude hidden indices', async () => {
    mockClient.indices.get.mockResolvedValue({
      ...MOCK_GET_INDICES_RESPONSES.regular,
      ...MOCK_GET_INDICES_RESPONSES.hiddenIndex,
    });

    await expect(
      fetchIndices('test', 5, { client, hasIndexStats: false, logger: mockLogger })
    ).resolves.toStrictEqual({
      indices: [
        {
          aliases: [],
          count: 100,
          name: 'unit-test-index',
        },
      ],
    });
  });
  it('should exclude closed indices', async () => {
    mockClient.indices.get.mockResolvedValue({
      ...MOCK_GET_INDICES_RESPONSES.regular,
      ...MOCK_GET_INDICES_RESPONSES.closedIndex,
    });

    await expect(
      fetchIndices('test', 5, { client, hasIndexStats: false, logger: mockLogger })
    ).resolves.toStrictEqual({
      indices: [
        {
          aliases: [],
          count: 100,
          name: 'unit-test-index',
        },
      ],
    });
  });
  it('should handle index count errors', async () => {
    mockClient.indices.get.mockResolvedValue(MOCK_GET_INDICES_RESPONSES.manyResults);
    mockClient.count.mockImplementation(({ index }) => {
      switch (index) {
        case 'unit-test-index-002':
          return Promise.reject(new Error('Boom!!!'));
        default:
          return Promise.resolve({ count: 100 });
      }
    });

    await expect(
      fetchIndices(undefined, 5, { client, hasIndexStats: false, logger: mockLogger })
    ).resolves.toStrictEqual({
      indices: [
        {
          aliases: [],
          count: 100,
          name: 'unit-test-index-001',
        },
        {
          aliases: [],
          count: 0,
          name: 'unit-test-index-002',
        },
        {
          aliases: [],
          count: 100,
          name: 'unit-test-index-003',
        },
        {
          aliases: [],
          count: 100,
          name: 'unit-test-index-004',
        },
        {
          aliases: [],
          count: 100,
          name: 'unit-test-index-005',
        },
      ],
    });

    expect(mockClient.count).toHaveBeenCalledTimes(5);
  });
  it('should throw if get indices fails', async () => {
    const expectedError = new Error('Oh No!!');
    mockClient.indices.get.mockRejectedValue(expectedError);

    await expect(
      fetchIndices(undefined, 5, { client, hasIndexStats: false, logger: mockLogger })
    ).rejects.toBe(expectedError);
  });
  it('should throw if get stats fails', async () => {
    const expectedError = new Error('Oh No!!');
    mockClient.indices.get.mockResolvedValue(MOCK_GET_INDICES_RESPONSES.regular);
    mockClient.indices.stats.mockRejectedValue(expectedError);

    await expect(
      fetchIndices(undefined, 5, { client, hasIndexStats: true, logger: mockLogger })
    ).rejects.toBe(expectedError);
  });
});
