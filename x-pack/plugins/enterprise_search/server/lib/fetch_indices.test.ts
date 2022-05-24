/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ByteSizeValue } from '@kbn/config-schema';
import { IScopedClusterClient } from '@kbn/core/server';

import { fetchIndices } from './fetch_indices';

describe('fetchIndices lib function', () => {
  const mockClient = {
    asCurrentUser: {
      indices: {
        get: jest.fn(),
        stats: jest.fn(),
      },
    },
    asInternalUser: {},
  };

  const regularIndexResponse = {
    'search-regular-index': {
      aliases: {},
    },
  };

  const regularIndexStatsResponse = {
    indices: {
      'search-regular-index': {
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

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return regular index without aliases', async () => {
    mockClient.asCurrentUser.indices.get.mockImplementation(() => regularIndexResponse);
    mockClient.asCurrentUser.indices.stats.mockImplementation(() => regularIndexStatsResponse);

    await expect(fetchIndices(mockClient as unknown as IScopedClusterClient)).resolves.toEqual([
      {
        health: 'green',
        status: 'open',
        uuid: '83a81e7e-5955-4255-b008-5d6961203f57',
        total: {
          docs: {
            count: 100,
            deleted: 0,
          },
          store: {
            size_in_bytes: '105.47kb',
          },
        },
        name: 'search-regular-index',
      },
    ]);
    expect(mockClient.asCurrentUser.indices.get).toHaveBeenCalledWith({
      expand_wildcards: ['open'],
      features: ['aliases', 'settings'],
      filter_path: ['*.aliases'],
      index: 'search-*',
    });

    expect(mockClient.asCurrentUser.indices.stats).toHaveBeenCalledWith({
      metric: ['docs', 'store'],
      expand_wildcards: ['open'],
      index: 'search-*',
    });
  });

  it('should return index with aliases', async () => {
    const aliasedIndexResponse = {
      'index-without-prefix': {
        ...regularIndexResponse['search-regular-index'],
        aliases: {
          'search-aliased': {},
          'search-double-aliased': {},
        },
      },
    };
    const aliasedStatsResponse = {
      indices: {
        'index-without-prefix': { ...regularIndexStatsResponse.indices['search-regular-index'] },
      },
    };

    mockClient.asCurrentUser.indices.get.mockImplementationOnce(() => aliasedIndexResponse);
    mockClient.asCurrentUser.indices.stats.mockImplementationOnce(() => aliasedStatsResponse);
    await expect(fetchIndices(mockClient as unknown as IScopedClusterClient)).resolves.toEqual([
      {
        health: 'green',
        status: 'open',
        uuid: '83a81e7e-5955-4255-b008-5d6961203f57',
        total: {
          docs: {
            count: 100,
            deleted: 0,
          },
          store: {
            size_in_bytes: '105.47kb',
          },
        },
        name: 'search-aliased',
      },
      {
        health: 'green',
        status: 'open',
        uuid: '83a81e7e-5955-4255-b008-5d6961203f57',
        total: {
          docs: {
            count: 100,
            deleted: 0,
          },
          store: {
            size_in_bytes: '105.47kb',
          },
        },
        name: 'search-double-aliased',
      },
    ]);
  });

  it('should handle index missing in stats call', async () => {
    const missingStatsResponse = {
      indices: {
        some_other_index: { ...regularIndexStatsResponse.indices['search-regular-index'] },
      },
    };

    mockClient.asCurrentUser.indices.get.mockImplementationOnce(() => regularIndexResponse);
    mockClient.asCurrentUser.indices.stats.mockImplementationOnce(() => missingStatsResponse);
    // simulates when an index has been deleted after get indices call
    // deleted index won't be present in the indices stats call response
    await expect(fetchIndices(mockClient as unknown as IScopedClusterClient)).resolves.toEqual([
      {
        name: 'search-regular-index',
        total: {
          docs: {
            count: 0,
            deleted: 0,
          },
          store: {
            size_in_bytes: '0b',
          },
        },
        uuid: undefined,
        health: undefined,
        status: undefined,
      },
    ]);
  });

  it('should return empty array when no index found', async () => {
    mockClient.asCurrentUser.indices.get.mockImplementationOnce(() => ({}));
    await expect(fetchIndices(mockClient as unknown as IScopedClusterClient)).resolves.toEqual([]);
    expect(mockClient.asCurrentUser.indices.stats).not.toHaveBeenCalled();
  });
});
