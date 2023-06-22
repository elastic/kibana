/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getIndexReturnValue,
  mockMultiIndexResponse,
  mockMultiStatsResponse,
  mockPrivilegesResponse,
} from '../../__mocks__/fetch_indices.mock';

import { ByteSizeValue } from '@kbn/config-schema';
import { IScopedClusterClient } from '@kbn/core/server';

import { fetchIndices, fetchSearchIndices } from './fetch_indices';

describe('fetch indices lib functions', () => {
  const mockClient = {
    asCurrentUser: {
      count: jest.fn().mockReturnValue({ count: 100 }),
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

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient.asCurrentUser.security.hasPrivileges.mockImplementation(() => ({
      index: {
        'index-without-prefix': { manage: true, read: true },
        'search-aliased': { manage: true, read: true },
        'search-double-aliased': { manage: true, read: true },
        'search-regular-index': { manage: true, read: true },
        'second-index': { manage: true, read: true },
      },
    }));
  });

  describe('fetchSearchIndices', () => {
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
        fetchSearchIndices(mockClient as unknown as IScopedClusterClient, {
          alias_pattern: 'search-',
          index_pattern: '.ent-search-engine-documents',
        })
      ).resolves.toEqual([
        {
          count: 100,
          health: 'green',
          hidden: false,
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
          count: 100,
          health: 'green',
          hidden: false,
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
          count: 100,
          health: 'green',
          hidden: false,
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
          count: 100,
          health: 'green',
          hidden: false,
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
    describe('alwaysShowPattern', () => {
      const sortIndices = (index1: any, index2: any) => {
        if (index1.name < index2.name) return -1;
        if (index1.name > index2.name) return 1;
        return 0;
      };

      it('overrides hidden indices setting', async () => {
        mockClient.asCurrentUser.indices.get.mockImplementation(() => mockMultiIndexResponse);
        mockClient.asCurrentUser.indices.stats.mockImplementation(() => mockMultiStatsResponse);

        mockClient.asCurrentUser.security.hasPrivileges.mockImplementation(() => ({
          index: mockPrivilegesResponse,
        }));
        const returnValue = await fetchSearchIndices(
          mockClient as unknown as IScopedClusterClient,
          { alias_pattern: 'search-', index_pattern: '.ent-search-engine-documents' }
        );

        // This is the list of mock indices and aliases that are:
        // - Non-hidden indices and aliases
        // - hidden indices that starts with ".ent-search-engine-documents"
        // - search- prefixed aliases that point to hidden indices
        expect(returnValue.sort(sortIndices)).toEqual(
          [
            'regular-index',
            'alias-regular-index',
            'search-alias-regular-index',
            'search-prefixed-regular-index',
            'alias-search-prefixed-regular-index',
            'search-alias-search-prefixed-regular-index',
            '.ent-search-engine-documents-12345',
            'search-alias-.ent-search-engine-documents-12345',
            'search-alias-search-prefixed-.ent-search-engine-documents-12345',
            'search-alias-hidden-index',
            'search-alias-search-prefixed-hidden-index',
          ]
            .map(getIndexReturnValue)
            .sort(sortIndices)
        );

        // This is the list of mock indices and aliases that are:
        // - Hidden indices
        // - aliases to hidden indices that has no prefix
        expect(returnValue).toEqual(
          expect.not.arrayContaining(
            [
              'hidden-index',
              'search-prefixed-hidden-index',
              'alias-hidden-index',
              'alias-search-prefixed-hidden-index',
              'alias-.ent-search-engine-documents-12345',
              'search-prefixed-.ent-search-engine-documents-12345',
              'alias-search-prefixed-.ent-search-engine-documents-12345',
            ].map(getIndexReturnValue)
          )
        );

        expect(mockClient.asCurrentUser.indices.get).toHaveBeenCalledWith({
          expand_wildcards: ['hidden', 'all'],
          features: ['aliases', 'settings'],
          filter_path: ['*.aliases', '*.settings.index.hidden'],
          index: '*',
        });

        expect(mockClient.asCurrentUser.indices.stats).toHaveBeenCalledWith({
          expand_wildcards: ['hidden', 'all'],
          index: '*',
          metric: ['docs', 'store'],
        });

        expect(mockClient.asCurrentUser.security.hasPrivileges).toHaveBeenCalledWith({
          index: [
            {
              names: expect.arrayContaining(Object.keys(mockMultiStatsResponse.indices)),
              privileges: ['read', 'manage'],
            },
          ],
        });
      });
    });
  });

  describe('fetchIndices', () => {
    it('should return regular index without aliases', async () => {
      mockClient.asCurrentUser.indices.get.mockImplementation(() => ({
        ...regularIndexResponse,
        hidden: { aliases: {}, settings: { index: { hidden: 'true' } } },
      }));
      mockClient.asCurrentUser.indices.stats.mockImplementation(() => regularIndexStatsResponse);

      await expect(
        fetchIndices(mockClient as unknown as IScopedClusterClient, 'search', false, false, 0, 20)
      ).resolves.toEqual({
        indexNames: ['search-regular-index'],
        indices: [
          {
            alias: false,
            aliases: [],
            count: 100,
            health: 'green',
            hidden: false,
            name: 'search-regular-index',
            privileges: { manage: true, read: true },
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
        ],
        totalResults: 1,
      });
      expect(mockClient.asCurrentUser.indices.get).toHaveBeenCalledWith({
        expand_wildcards: ['open'],
        features: ['aliases', 'settings'],
        filter_path: [
          '*.aliases',
          '*.settings.index.hidden',
          '*.settings.index.verified_before_close',
        ],
        index: '*search*',
      });

      expect(mockClient.asCurrentUser.indices.stats).toHaveBeenCalledWith({
        index: ['search-regular-index'],
        metric: ['docs', 'store'],
      });

      expect(mockClient.asCurrentUser.security.hasPrivileges).toHaveBeenCalledWith({
        index: [
          {
            names: ['search-regular-index'],
            privileges: ['read', 'manage'],
          },
        ],
      });
    });

    it('should return hidden indices if specified', async () => {
      mockClient.asCurrentUser.indices.get.mockImplementation(() => ({
        ...regularIndexResponse,
        ['search-regular-index']: {
          ...regularIndexResponse['search-regular-index'],
          ...{ settings: { index: { hidden: 'true' } } },
        },
      }));
      mockClient.asCurrentUser.indices.stats.mockImplementation(() => regularIndexStatsResponse);

      await expect(
        fetchIndices(mockClient as unknown as IScopedClusterClient, undefined, true, false, 0, 20)
      ).resolves.toEqual({
        indexNames: ['search-regular-index'],
        indices: [
          {
            alias: false,
            aliases: [],
            count: 100,
            health: 'green',
            hidden: true,
            name: 'search-regular-index',
            privileges: { manage: true, read: true },
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
        ],
        totalResults: 1,
      });
      expect(mockClient.asCurrentUser.indices.get).toHaveBeenCalledWith({
        expand_wildcards: ['hidden', 'all'],
        features: ['aliases', 'settings'],
        filter_path: [
          '*.aliases',
          '*.settings.index.hidden',
          '*.settings.index.verified_before_close',
        ],
        index: '*',
      });

      expect(mockClient.asCurrentUser.indices.stats).toHaveBeenCalledWith({
        index: ['search-regular-index'],
        metric: ['docs', 'store'],
      });
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
        fetchIndices(mockClient as unknown as IScopedClusterClient, 'search-*', false, false, 0, 20)
      ).resolves.toEqual({
        indexNames: ['search-regular-index'],
        indices: [
          {
            alias: false,
            aliases: [],
            count: 100,
            health: undefined,
            hidden: false,
            name: 'search-regular-index',
            status: undefined,
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
        ],
        totalResults: 1,
      });
    });

    it('should return empty array when no index found', async () => {
      mockClient.asCurrentUser.indices.get.mockImplementationOnce(() => ({}));
      await expect(
        fetchIndices(mockClient as unknown as IScopedClusterClient, 'search-*', false, false, 0, 20)
      ).resolves.toEqual({ indexNames: [], indices: [], totalResults: 0 });
      expect(mockClient.asCurrentUser.indices.stats).not.toHaveBeenCalled();
    });
  });
});
