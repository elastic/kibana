/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import { DataViewsService } from '@kbn/data-views-plugin/common';

import { ANALYTICS_COLLECTIONS_INDEX } from '../..';
import { ErrorCode } from '../../../common/types/error_codes';

import { addAnalyticsCollection } from './add_analytics_collection';
import { fetchAnalyticsCollectionById } from './fetch_analytics_collection';
import { setupAnalyticsCollectionIndex } from './setup_indices';

jest.mock('./fetch_analytics_collection', () => ({ fetchAnalyticsCollectionById: jest.fn() }));
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

  const mockDataViewsService = {
    createAndSave: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should add analytics collection', async () => {
    mockClient.asCurrentUser.index.mockImplementation(() => ({ _id: 'example' }));
    mockClient.asCurrentUser.indices.exists.mockImplementation(() => false);

    await expect(
      addAnalyticsCollection(
        mockClient as unknown as IScopedClusterClient,
        mockDataViewsService as unknown as DataViewsService,
        {
          name: 'example',
        }
      )
    ).resolves.toEqual({
      event_retention_day_length: 180,
      events_datastream: 'logs-elastic_analytics.events-example',
      id: 'example',
      name: 'example',
    });

    expect(mockClient.asCurrentUser.index).toHaveBeenCalledWith({
      document: {
        event_retention_day_length: 180,
        events_datastream: 'logs-elastic_analytics.events-example',
        name: 'example',
      },
      id: 'example',
      index: ANALYTICS_COLLECTIONS_INDEX,
    });

    expect(mockDataViewsService.createAndSave).toHaveBeenCalledWith(
      {
        allowNoIndex: true,
        name: 'elastic_analytics.events-example',
        title: 'logs-elastic_analytics.events-example',
        timeFieldName: '@timestamp',
      },
      true
    );
  });

  it('should reject if index already exists', async () => {
    mockClient.asCurrentUser.index.mockImplementation(() => ({ _id: 'fakeId' }));
    (fetchAnalyticsCollectionById as jest.Mock).mockImplementation(() => true);

    await expect(
      addAnalyticsCollection(
        mockClient as unknown as IScopedClusterClient,
        mockDataViewsService as unknown as DataViewsService,
        {
          name: 'index_name',
        }
      )
    ).rejects.toEqual(new Error(ErrorCode.ANALYTICS_COLLECTION_ALREADY_EXISTS));
    expect(mockClient.asCurrentUser.index).not.toHaveBeenCalled();
    expect(mockDataViewsService.createAndSave).not.toHaveBeenCalled();
  });

  it('should create index if no analytics collection index exists', async () => {
    mockClient.asCurrentUser.indices.exists.mockImplementation(() => false);

    (fetchAnalyticsCollectionById as jest.Mock).mockImplementation(() => undefined);

    mockClient.asCurrentUser.index.mockImplementation(() => ({ _id: 'example' }));

    await expect(
      addAnalyticsCollection(
        mockClient as unknown as IScopedClusterClient,
        mockDataViewsService as unknown as DataViewsService,
        {
          name: 'example',
        }
      )
    ).resolves.toEqual({
      event_retention_day_length: 180,
      events_datastream: 'logs-elastic_analytics.events-example',
      id: 'example',
      name: 'example',
    });

    expect(mockClient.asCurrentUser.index).toHaveBeenCalledWith({
      document: {
        event_retention_day_length: 180,
        events_datastream: 'logs-elastic_analytics.events-example',
        name: 'example',
      },
      id: 'example',
      index: ANALYTICS_COLLECTIONS_INDEX,
    });

    expect(setupAnalyticsCollectionIndex).toHaveBeenCalledWith(mockClient.asCurrentUser);
  });

  it('should not create index if status code is not 404', async () => {
    mockClient.asCurrentUser.index.mockImplementationOnce(() => {
      return Promise.reject({ statusCode: 500 });
    });
    mockClient.asCurrentUser.indices.exists.mockImplementation(() => true);
    (fetchAnalyticsCollectionById as jest.Mock).mockImplementation(() => false);
    await expect(
      addAnalyticsCollection(
        mockClient as unknown as IScopedClusterClient,
        mockDataViewsService as unknown as DataViewsService,
        {
          name: 'example',
        }
      )
    ).rejects.toEqual({ statusCode: 500 });
    expect(setupAnalyticsCollectionIndex).not.toHaveBeenCalled();
    expect(mockClient.asCurrentUser.index).toHaveBeenCalledTimes(1);
    expect(mockDataViewsService.createAndSave).not.toHaveBeenCalled();
  });
});
