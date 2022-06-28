/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ByteSizeValue } from '@kbn/config-schema';
import { IScopedClusterClient } from '@kbn/core/server';

import { fetchIndex } from './fetch_index';

describe('fetchIndex lib function', () => {
  const mockClient = {
    asCurrentUser: {
      indices: {
        get: jest.fn(),
        stats: jest.fn(),
      },
      index: jest.fn(),
      search: jest.fn(),
    },
    asInternalUser: {},
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const statsResponse = {
    indices: {
      index_name: {
        health: 'green',
        status: 'open',
        uuid: '83a81e7e-5955-4255-b008-5d6961203f57',
        total: {
          docs: {
            count: 100,
            deleted: 0,
          },
          store: {
            size_in_bytes: 108000,
          },
        },
        size: new ByteSizeValue(108000).toString(),
      },
    },
  };

  const result = {
    index: {
      aliases: [],
      health: 'green',
      name: 'index_name',
      status: 'open',
      total: {
        docs: {
          count: 100,
          deleted: 0,
        },
        store: {
          size_in_bytes: '105.47kb',
        },
      },
      uuid: '83a81e7e-5955-4255-b008-5d6961203f57',
    },
  };

  it('should return data and stats for index if no connector is present', async () => {
    mockClient.asCurrentUser.indices.get.mockImplementation(() =>
      Promise.resolve({
        index_name: { data: 'full index', aliases: [] },
      })
    );
    mockClient.asCurrentUser.search.mockImplementation(() =>
      Promise.resolve({
        hits: {
          hits: [],
        },
      })
    );
    mockClient.asCurrentUser.indices.stats.mockImplementation(() => Promise.resolve(statsResponse));

    await expect(
      fetchIndex(mockClient as unknown as IScopedClusterClient, 'index_name')
    ).resolves.toEqual(result);
  });
  it('should return data and stats for index and connector if connector is present', async () => {
    mockClient.asCurrentUser.indices.get.mockImplementation(() =>
      Promise.resolve({
        index_name: { data: 'full index', aliases: [] },
      })
    );
    mockClient.asCurrentUser.search.mockImplementation(() =>
      Promise.resolve({
        hits: {
          hits: [{ _source: { doc: 'doc' } }],
        },
      })
    );
    mockClient.asCurrentUser.indices.stats.mockImplementation(() => Promise.resolve(statsResponse));

    await expect(
      fetchIndex(mockClient as unknown as IScopedClusterClient, 'index_name')
    ).resolves.toEqual({ ...result, connector: { doc: 'doc' } });
  });
  it('should throw a 404 error if the index cannot be fonud', async () => {
    mockClient.asCurrentUser.indices.get.mockImplementation(() => Promise.resolve({}));
    mockClient.asCurrentUser.search.mockImplementation(() =>
      Promise.resolve({
        hits: {
          hits: [],
        },
      })
    );
    mockClient.asCurrentUser.indices.stats.mockImplementation(() => Promise.resolve(statsResponse));

    await expect(
      fetchIndex(mockClient as unknown as IScopedClusterClient, 'index_name')
    ).rejects.toEqual(new Error('404'));
  });
  it('should throw a 404 error if the indexStats cannot be fonud', async () => {
    mockClient.asCurrentUser.indices.get.mockImplementation(() =>
      Promise.resolve({
        index_name: { aliases: [] },
      })
    );
    mockClient.asCurrentUser.search.mockImplementation(() =>
      Promise.resolve({
        hits: {
          hits: [],
        },
      })
    );
    mockClient.asCurrentUser.indices.stats.mockImplementation(() =>
      Promise.resolve({ indices: {} })
    );

    await expect(
      fetchIndex(mockClient as unknown as IScopedClusterClient, 'index_name')
    ).rejects.toEqual(new Error('404'));
  });
  it('should throw a 404 error if the index stats indices cannot be fonud', async () => {
    mockClient.asCurrentUser.indices.get.mockImplementation(() =>
      Promise.resolve({
        index_name: { aliases: [] },
      })
    );
    mockClient.asCurrentUser.search.mockImplementation(() =>
      Promise.resolve({
        hits: {
          hits: [],
        },
      })
    );
    mockClient.asCurrentUser.indices.stats.mockImplementation(() => Promise.resolve({}));

    await expect(
      fetchIndex(mockClient as unknown as IScopedClusterClient, 'index_name')
    ).rejects.toEqual(new Error('404'));
  });
});
