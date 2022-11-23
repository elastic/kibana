/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core-elasticsearch-server';

import { ANALYTICS_COLLECTIONS_INDEX } from '../..';

import {
  fetchAnalyticsCollectionById,
  fetchAnalyticsCollections,
} from './fetch_analytics_collection';
import { setupAnalyticsCollectionIndex } from './setup_indices';

jest.mock('./setup_indices', () => ({
  setupAnalyticsCollectionIndex: jest.fn(),
}));

describe('fetch analytics collection lib function', () => {
  const mockClient = {
    asCurrentUser: {
      get: jest.fn(),
      search: jest.fn(),
    },
    asInternalUser: {},
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetch collections', () => {
    it('should return a list of analytics collections', async () => {
      mockClient.asCurrentUser.search.mockImplementationOnce(() =>
        Promise.resolve({
          hits: {
            hits: [
              { _id: '2', _source: { name: 'example' } },
              { _id: '1', _source: { name: 'example2' } },
            ],
          },
        })
      );
      await expect(
        fetchAnalyticsCollections(mockClient as unknown as IScopedClusterClient)
      ).resolves.toEqual([
        { id: '2', name: 'example' },
        { id: '1', name: 'example2' },
      ]);
    });

    it('should setup the indexes if none exist and return an empty array', async () => {
      mockClient.asCurrentUser.search.mockImplementationOnce(() =>
        Promise.reject({
          meta: {
            body: {
              error: {
                type: 'index_not_found_exception',
              },
            },
          },
        })
      );

      await expect(
        fetchAnalyticsCollections(mockClient as unknown as IScopedClusterClient)
      ).resolves.toEqual([]);

      expect(setupAnalyticsCollectionIndex as jest.Mock).toHaveBeenCalledWith(
        mockClient.asCurrentUser
      );
    });

    it('should not call setup analytics index on other errors and return error', async () => {
      const error = {
        meta: {
          body: {
            error: {
              type: 'other error',
            },
          },
        },
      };
      mockClient.asCurrentUser.search.mockImplementationOnce(() => Promise.reject(error));
      await expect(
        fetchAnalyticsCollections(mockClient as unknown as IScopedClusterClient)
      ).rejects.toMatchObject(error);

      expect(mockClient.asCurrentUser.search).toHaveBeenCalledWith({
        from: 0,
        index: ANALYTICS_COLLECTIONS_INDEX,
        query: {
          match_all: {},
        },
        size: 1000,
      });
      expect(setupAnalyticsCollectionIndex as jest.Mock).not.toHaveBeenCalled();
    });
  });

  describe('fetch collection by Id', () => {
    it('should fetch analytics collection by Id', async () => {
      mockClient.asCurrentUser.get.mockImplementationOnce(() =>
        Promise.resolve({ _id: 'example', _source: { name: 'example' } })
      );

      await expect(
        fetchAnalyticsCollectionById(mockClient as unknown as IScopedClusterClient, 'example')
      ).resolves.toEqual({ id: 'example', name: 'example' });

      expect(mockClient.asCurrentUser.get).toHaveBeenCalledWith({
        id: 'example',
        index: ANALYTICS_COLLECTIONS_INDEX,
      });
    });

    it('should call setup analytics collection index on index not found error', async () => {
      mockClient.asCurrentUser.get.mockImplementationOnce(() =>
        Promise.reject({
          meta: {
            body: {
              error: { type: 'index_not_found_exception' },
            },
          },
        })
      );
      await expect(
        fetchAnalyticsCollectionById(mockClient as unknown as IScopedClusterClient, 'example')
      ).resolves.toEqual(undefined);
      expect(mockClient.asCurrentUser.get).toHaveBeenCalledWith({
        id: 'example',
        index: ANALYTICS_COLLECTIONS_INDEX,
      });
      expect(setupAnalyticsCollectionIndex as jest.Mock).toHaveBeenCalledWith(
        mockClient.asCurrentUser
      );
    });

    it('should not call setup analytics indices on other errors', async () => {
      mockClient.asCurrentUser.get.mockImplementationOnce(() =>
        Promise.reject({
          meta: {
            body: {
              error: {
                type: 'other error',
              },
            },
          },
        })
      );
      await expect(fetchAnalyticsCollectionById(mockClient as any, 'example')).resolves.toEqual(
        undefined
      );
      expect(mockClient.asCurrentUser.get).toHaveBeenCalledWith({
        id: 'example',
        index: ANALYTICS_COLLECTIONS_INDEX,
      });
      expect(setupAnalyticsCollectionIndex as jest.Mock).not.toHaveBeenCalled();
    });
  });
});
