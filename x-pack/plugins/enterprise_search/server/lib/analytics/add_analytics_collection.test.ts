/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core-elasticsearch-server';

import { ANALYTICS_COLLECTIONS_INDEX } from '../..';
import { ErrorCode } from '../../../common/types/error_codes';

import { addAnalyticsCollection } from './add_analytics_collection';
import { fetchAnalyticsCollectionByName } from './fetch_analytics_collection';
import { setupAnalyticsCollectionIndex } from './setup_indices';

jest.mock('./fetch_analytics_collection', () => ({ fetchAnalyticsCollectionByName: jest.fn() }));
jest.mock('./setup_indices', () => ({
  setupAnalyticsCollectionIndex: jest.fn(),
}));

describe('add analytics collection lib function', () => {
  const mockClient = {
    asCurrentUser: {
      index: jest.fn(),
      indices: {
        create: jest.fn(),
        exists: jest.fn(),
        refresh: jest.fn(),
      },
    },
    asInternalUser: {},
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should add analytics collection', async () => {
    mockClient.asCurrentUser.index.mockImplementation(() => ({ _id: 'fakeId' }));
    mockClient.asCurrentUser.indices.exists.mockImplementation(() => false);

    await expect(
      addAnalyticsCollection(mockClient as unknown as IScopedClusterClient, {
        name: 'example',
      })
    ).resolves.toEqual({ event_retention_day_length: 180, id: 'fakeId', name: 'example' });

    expect(mockClient.asCurrentUser.index).toHaveBeenCalledWith({
      document: {
        event_retention_day_length: 180,
        name: 'example',
      },
      index: ANALYTICS_COLLECTIONS_INDEX,
    });
  });

  it('should reject if index already exists', async () => {
    mockClient.asCurrentUser.index.mockImplementation(() => ({ _id: 'fakeId' }));
    (fetchAnalyticsCollectionByName as jest.Mock).mockImplementation(() => true);

    await expect(
      addAnalyticsCollection(mockClient as unknown as IScopedClusterClient, {
        name: 'index_name',
      })
    ).rejects.toEqual(new Error(ErrorCode.ANALYTICS_COLLECTION_ALREADY_EXISTS));
    expect(mockClient.asCurrentUser.index).not.toHaveBeenCalled();
  });

  it('should create index if no analytics collection index exists', async () => {
    mockClient.asCurrentUser.indices.exists.mockImplementation(() => false);

    (fetchAnalyticsCollectionByName as jest.Mock).mockImplementation(() => undefined);

    mockClient.asCurrentUser.index.mockImplementation(() => ({ _id: 'fakeId' }));

    await expect(
      addAnalyticsCollection(mockClient as unknown as IScopedClusterClient, {
        name: 'example',
      })
    ).resolves.toEqual({ event_retention_day_length: 180, id: 'fakeId', name: 'example' });

    expect(mockClient.asCurrentUser.index).toHaveBeenCalledWith({
      document: {
        event_retention_day_length: 180,
        name: 'example',
      },
      index: ANALYTICS_COLLECTIONS_INDEX,
    });

    expect(setupAnalyticsCollectionIndex).toHaveBeenCalledWith(mockClient.asCurrentUser);
  });

  it('should not create index if status code is not 404', async () => {
    mockClient.asCurrentUser.index.mockImplementationOnce(() => {
      return Promise.reject({ statusCode: 500 });
    });
    mockClient.asCurrentUser.indices.exists.mockImplementation(() => true);
    (fetchAnalyticsCollectionByName as jest.Mock).mockImplementation(() => false);
    await expect(
      addAnalyticsCollection(mockClient as unknown as IScopedClusterClient, {
        name: 'example',
      })
    ).rejects.toEqual({ statusCode: 500 });
    expect(setupAnalyticsCollectionIndex).not.toHaveBeenCalled();
    expect(mockClient.asCurrentUser.index).toHaveBeenCalledTimes(1);
  });
});
