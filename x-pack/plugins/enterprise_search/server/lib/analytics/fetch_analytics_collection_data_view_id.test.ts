/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core-elasticsearch-server';

import { DataViewsService } from '@kbn/data-views-plugin/common';

import { ErrorCode } from '../../../common/types/error_codes';

import { fetchAnalyticsCollectionById } from './fetch_analytics_collection';
import { fetchAnalyticsCollectionDataViewId } from './fetch_analytics_collection_data_view_id';

jest.mock('./fetch_analytics_collection', () => ({
  fetchAnalyticsCollectionById: jest.fn(),
}));

describe('fetch analytics collection data view id', () => {
  const mockClient = {};
  const dataViewService = { find: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return data view id of analytics collection by Id', async () => {
    const mockCollectionId = 'collectionId';
    const mockDataViewId = 'dataViewId';
    const mockCollection = { events_datastream: 'log-collection-data-stream' };
    (fetchAnalyticsCollectionById as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve(mockCollection)
    );

    dataViewService.find.mockImplementationOnce(() => Promise.resolve([{ id: mockDataViewId }]));

    await expect(
      fetchAnalyticsCollectionDataViewId(
        mockClient as unknown as IScopedClusterClient,
        dataViewService as unknown as DataViewsService,
        mockCollectionId
      )
    ).resolves.toEqual({ data_view_id: mockDataViewId });
    expect(fetchAnalyticsCollectionById).toHaveBeenCalledWith(mockClient, mockCollectionId);
    expect(dataViewService.find).toHaveBeenCalledWith(mockCollection.events_datastream, 1);
  });

  it('should return null when data view not found', async () => {
    const mockCollectionId = 'collectionId';
    const mockCollection = { events_datastream: 'log-collection-data-stream' };
    (fetchAnalyticsCollectionById as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve(mockCollection)
    );

    dataViewService.find.mockImplementationOnce(() => Promise.resolve([]));

    await expect(
      fetchAnalyticsCollectionDataViewId(
        mockClient as unknown as IScopedClusterClient,
        dataViewService as unknown as DataViewsService,
        mockCollectionId
      )
    ).resolves.toEqual({ data_view_id: null });
    expect(fetchAnalyticsCollectionById).toHaveBeenCalledWith(mockClient, mockCollectionId);
    expect(dataViewService.find).toHaveBeenCalledWith(mockCollection.events_datastream, 1);
  });

  it('should throw an error when analytics collection not found', async () => {
    const mockCollectionId = 'collectionId';
    (fetchAnalyticsCollectionById as jest.Mock).mockImplementationOnce(() => Promise.resolve(null));

    await expect(
      fetchAnalyticsCollectionDataViewId(
        mockClient as unknown as IScopedClusterClient,
        dataViewService as unknown as DataViewsService,
        mockCollectionId
      )
    ).rejects.toThrowError(ErrorCode.ANALYTICS_COLLECTION_NOT_FOUND);
    expect(fetchAnalyticsCollectionById).toHaveBeenCalledWith(mockClient, mockCollectionId);
    expect(dataViewService.find).not.toHaveBeenCalled();
  });
});
