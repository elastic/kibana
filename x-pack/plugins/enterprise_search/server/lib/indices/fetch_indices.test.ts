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
      security: {
        hasPrivileges: jest.fn(),
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

  mockClient.asCurrentUser.security.hasPrivileges.mockImplementation(() => ({
    index: {
      'index-without-prefix': { read: true, manage: true },
      'search-aliased': { read: true, manage: true },
      'search-double-aliased': { read: true, manage: true },
      'search-regular-index': { read: true, manage: true },
      'second-index': { read: true, manage: true },
    },
  }));

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return regular index without aliases', async () => {
    mockClient.asCurrentUser.indices.get.mockImplementation(() => ({
      ...regularIndexResponse,
      hidden: { aliases: {}, settings: { index: { hidden: 'true' } } },
    }));
    mockClient.asCurrentUser.indices.stats.mockImplementation(() => regularIndexStatsResponse);

    await expect(
      fetchIndices(mockClient as unknown as IScopedClusterClient, 'search-*', false)
    ).resolves.toEqual([
      {
        health: 'green',
        name: 'search-regular-index',
        status: 'open',
        alias: false,
        privileges: { read: true, manage: true },
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
    ]);
    expect(mockClient.asCurrentUser.indices.get).toHaveBeenCalledWith({
      expand_wildcards: ['open'],
      features: ['aliases', 'settings'],
      filter_path: ['*.aliases', '*.settings.index.hidden'],
      index: 'search-*',
    });

    expect(mockClient.asCurrentUser.indices.stats).toHaveBeenCalledWith({
      expand_wildcards: ['open'],
      index: 'search-*',
      metric: ['docs', 'store'],
    });

    expect(mockClient.asCurrentUser.security.hasPrivileges).toHaveBeenCalledWith({
      index: [
        {
          names: ['search-regular-index', 'hidden'],
          privileges: ['read', 'manage'],
        },
      ],
    });
  });

  it('should return hidden indices without aliases if specified', async () => {
    mockClient.asCurrentUser.indices.get.mockImplementation(() => regularIndexResponse);
    mockClient.asCurrentUser.indices.stats.mockImplementation(() => regularIndexStatsResponse);

    await expect(
      fetchIndices(mockClient as unknown as IScopedClusterClient, 'search-*', true)
    ).resolves.toEqual([
      {
        health: 'green',
        name: 'search-regular-index',
        status: 'open',
        alias: false,
        privileges: { read: true, manage: true },
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
    ]);
    expect(mockClient.asCurrentUser.indices.get).toHaveBeenCalledWith({
      expand_wildcards: ['hidden', 'all'],
      features: ['aliases', 'settings'],
      filter_path: ['*.aliases', '*.settings.index.hidden'],
      index: 'search-*',
    });

    expect(mockClient.asCurrentUser.indices.stats).toHaveBeenCalledWith({
      expand_wildcards: ['hidden', 'all'],
      index: 'search-*',
      metric: ['docs', 'store'],
    });
  });

  it('should return index with unique aliases', async () => {
    const aliasedIndexResponse = {
      'index-without-prefix': {
        ...regularIndexResponse['search-regular-index'],
        aliases: {
          'search-aliased': {},
          'search-double-aliased': {},
        },
      },
      'second-index': {
        ...regularIndexResponse['search-regular-index'],
        aliases: {
          'search-aliased': {},
        },
      },
    };
    const aliasedStatsResponse = {
      indices: {
        'index-without-prefix': { ...regularIndexStatsResponse.indices['search-regular-index'] },
        'second-index': { ...regularIndexStatsResponse.indices['search-regular-index'] },
      },
    };

    mockClient.asCurrentUser.indices.get.mockImplementationOnce(() => aliasedIndexResponse);
    mockClient.asCurrentUser.indices.stats.mockImplementationOnce(() => aliasedStatsResponse);
    await expect(
      fetchIndices(mockClient as unknown as IScopedClusterClient, 'search-*', false)
    ).resolves.toEqual([
      {
        health: 'green',
        name: 'index-without-prefix',
        status: 'open',
        alias: false,
        privileges: { read: true, manage: true },
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
      {
        health: 'green',
        name: 'search-aliased',
        status: 'open',
        alias: true,
        privileges: { read: true, manage: true },
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
      {
        health: 'green',
        name: 'search-double-aliased',
        status: 'open',
        alias: true,
        privileges: { read: true, manage: true },
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
      {
        health: 'green',
        name: 'second-index',
        status: 'open',
        alias: false,
        privileges: { read: true, manage: true },
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
    await expect(
      fetchIndices(mockClient as unknown as IScopedClusterClient, 'search-*', false)
    ).resolves.toEqual([
      {
        health: undefined,
        name: 'search-regular-index',
        status: undefined,
        alias: false,
        privileges: { read: true, manage: true },
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
      },
    ]);
  });

  it('should return empty array when no index found', async () => {
    mockClient.asCurrentUser.indices.get.mockImplementationOnce(() => ({}));
    await expect(
      fetchIndices(mockClient as unknown as IScopedClusterClient, 'search-*', false)
    ).resolves.toEqual([]);
    expect(mockClient.asCurrentUser.indices.stats).not.toHaveBeenCalled();
  });
});
