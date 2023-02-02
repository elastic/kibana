/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core-elasticsearch-server';

import { ANALYTICS_COLLECTIONS_INDEX } from '../..';
import { AnalyticsCollection } from '../../../common/types/analytics';

import { ErrorCode } from '../../../common/types/error_codes';

import { deleteAnalyticsCollectionById } from './delete_analytics_collection';
import { fetchAnalyticsCollectionById } from './fetch_analytics_collection';

jest.mock('./fetch_analytics_collection', () => ({
  fetchAnalyticsCollectionById: jest.fn(),
}));

describe('delete analytics collection lib function', () => {
  const mockClient = {
    asCurrentUser: {
      delete: jest.fn(),
    },
    asInternalUser: {},
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('deleting analytics collections', () => {
    it('should delete an analytics collection', async () => {
      (fetchAnalyticsCollectionById as jest.Mock).mockImplementationOnce(() => {
        return Promise.resolve({
          event_retention_day_length: 180,
          id: 'example',
          name: 'example',
        } as AnalyticsCollection);
      });

      await expect(
        deleteAnalyticsCollectionById(mockClient as unknown as IScopedClusterClient, 'example')
      ).resolves.toBeUndefined();

      expect(mockClient.asCurrentUser.delete).toHaveBeenCalledWith({
        id: 'example',
        index: ANALYTICS_COLLECTIONS_INDEX,
      });
    });

    it('should throw an exception when analytics collection does not exist', async () => {
      (fetchAnalyticsCollectionById as jest.Mock).mockImplementationOnce(() =>
        Promise.resolve(undefined)
      );

      await expect(
        deleteAnalyticsCollectionById(mockClient as unknown as IScopedClusterClient, 'example')
      ).rejects.toEqual(new Error(ErrorCode.ANALYTICS_COLLECTION_NOT_FOUND));

      expect(mockClient.asCurrentUser.delete).not.toHaveBeenCalled();
    });
  });
});
