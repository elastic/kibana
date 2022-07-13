/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ByteSizeValue } from '@kbn/config-schema';
import { IScopedClusterClient } from '@kbn/core/server';

import { fetchConnectorByIndexName } from '../connectors/fetch_connectors';

import { fetchIndex } from './fetch_index';

jest.mock('../connectors/fetch_connectors', () => ({
  fetchConnectorByIndexName: jest.fn(),
}));

describe('fetchIndex lib function', () => {
  const mockClient = {
    asCurrentUser: {
      index: jest.fn(),
      indices: {
        get: jest.fn(),
        stats: jest.fn(),
      },
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
        size: new ByteSizeValue(108000).toString(),
        status: 'open',
        total: {
          docs: {
            count: 100,
            deleted: 0,
          },
          store: {
            size_in_bytes: 108000,
          },
        },
        uuid: '83a81e7e-5955-4255-b008-5d6961203f57',
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

  it('should return data and stats for index if no connector or crawler is present', async () => {
    mockClient.asCurrentUser.indices.get.mockImplementation(() =>
      Promise.resolve({
        index_name: { aliases: [], data: 'full index' },
      })
    );
    mockClient.asCurrentUser.search.mockImplementation(() =>
      Promise.resolve({ hits: { hits: [] } })
    );
    (fetchConnectorByIndexName as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve(undefined)
    );
    mockClient.asCurrentUser.indices.stats.mockImplementation(() => Promise.resolve(statsResponse));

    await expect(
      fetchIndex(mockClient as unknown as IScopedClusterClient, 'index_name')
    ).resolves.toEqual(result);
  });

  it('should return data and stats for index and connector if connector is present', async () => {
    mockClient.asCurrentUser.indices.get.mockImplementation(() =>
      Promise.resolve({
        index_name: { aliases: [], data: 'full index' },
      })
    );
    mockClient.asCurrentUser.search.mockImplementation(() =>
      Promise.resolve({ hits: { hits: [] } })
    );
    (fetchConnectorByIndexName as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({ doc: 'doc' })
    );
    mockClient.asCurrentUser.indices.stats.mockImplementation(() => Promise.resolve(statsResponse));

    await expect(
      fetchIndex(mockClient as unknown as IScopedClusterClient, 'index_name')
    ).resolves.toEqual({ ...result, connector: { doc: 'doc' } });
  });

  it('should return data and stats for index and crawler if crawler is present', async () => {
    mockClient.asCurrentUser.indices.get.mockImplementation(() =>
      Promise.resolve({
        index_name: { aliases: [], data: 'full index' },
      })
    );
    (fetchConnectorByIndexName as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve(undefined)
    );
    mockClient.asCurrentUser.search.mockImplementation(() => ({
      hits: { hits: [{ _source: 'source' }] },
    }));
    mockClient.asCurrentUser.indices.stats.mockImplementation(() => Promise.resolve(statsResponse));

    await expect(
      fetchIndex(mockClient as unknown as IScopedClusterClient, 'index_name')
    ).resolves.toEqual({ ...result, crawler: 'source' });
  });
  it('should throw a 404 error if the index cannot be fonud', async () => {
    mockClient.asCurrentUser.indices.get.mockImplementation(() => Promise.resolve({}));
    (fetchConnectorByIndexName as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve(undefined)
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
    (fetchConnectorByIndexName as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve(undefined)
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
    (fetchConnectorByIndexName as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve(undefined)
    );
    mockClient.asCurrentUser.indices.stats.mockImplementation(() => Promise.resolve({}));

    await expect(
      fetchIndex(mockClient as unknown as IScopedClusterClient, 'index_name')
    ).rejects.toEqual(new Error('404'));
  });
});
