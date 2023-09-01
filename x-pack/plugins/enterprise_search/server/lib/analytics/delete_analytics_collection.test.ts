/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core-elasticsearch-server';

import { ErrorCode } from '../../../common/types/error_codes';

import { deleteAnalyticsCollectionById } from './delete_analytics_collection';

describe('delete analytics collection lib function', () => {
  const mockClient = {
    asCurrentUser: {
      searchApplication: {
        deleteBehavioralAnalytics: jest.fn(),
      },
    },
    asInternalUser: {},
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('deleting analytics collections', () => {
    it('should delete an analytics collection', async () => {
      await expect(
        deleteAnalyticsCollectionById(mockClient as unknown as IScopedClusterClient, 'example')
      ).resolves.toBeUndefined();

      expect(
        mockClient.asCurrentUser.searchApplication.deleteBehavioralAnalytics
      ).toHaveBeenCalledWith({
        name: 'example',
      });
    });

    it('should throw an exception when analytics collection does not exist', async () => {
      mockClient.asCurrentUser.searchApplication.deleteBehavioralAnalytics.mockImplementation(() =>
        Promise.reject({
          meta: {
            body: {
              error: {
                type: 'resource_not_found_exception',
              },
            },
          },
        })
      );

      await expect(
        deleteAnalyticsCollectionById(mockClient as unknown as IScopedClusterClient, 'example')
      ).rejects.toEqual(new Error(ErrorCode.ANALYTICS_COLLECTION_NOT_FOUND));
    });
  });
});
