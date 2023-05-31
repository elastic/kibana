/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import { DataViewsService } from '@kbn/data-views-plugin/common';

import { ErrorCode } from '../../../common/types/error_codes';

import { addAnalyticsCollection } from './add_analytics_collection';
import { fetchAnalyticsCollections } from './fetch_analytics_collection';

jest.mock('./fetch_analytics_collection', () => ({ fetchAnalyticsCollections: jest.fn() }));

describe('add analytics collection lib function', () => {
  const mockClient = {
    asCurrentUser: {
      searchApplication: {
        putBehavioralAnalytics: jest.fn(),
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
    mockClient.asCurrentUser.searchApplication.putBehavioralAnalytics.mockImplementation(() => ({
      acknowledged: true,
      name: `example`,
    }));

    (fetchAnalyticsCollections as jest.Mock).mockImplementation(() => [
      {
        events_datastream: 'example-datastream',
        name: 'example',
      },
    ]);

    await expect(
      addAnalyticsCollection(
        mockClient as unknown as IScopedClusterClient,
        mockDataViewsService as unknown as DataViewsService,
        'example'
      )
    ).resolves.toEqual({
      events_datastream: 'example-datastream',
      name: 'example',
    });

    expect(mockClient.asCurrentUser.searchApplication.putBehavioralAnalytics).toHaveBeenCalledWith({
      name: 'example',
    });

    expect(mockDataViewsService.createAndSave).toHaveBeenCalledWith(
      {
        allowNoIndex: true,
        name: 'behavioral_analytics.events-example',
        title: 'example-datastream',
        timeFieldName: '@timestamp',
      },
      true
    );
  });

  it('should reject if analytics collection already exists', async () => {
    mockClient.asCurrentUser.searchApplication.putBehavioralAnalytics.mockImplementation(() =>
      Promise.reject({
        meta: {
          body: {
            error: {
              type: 'resource_already_exists_exception',
            },
          },
        },
      })
    );

    await expect(
      addAnalyticsCollection(
        mockClient as unknown as IScopedClusterClient,
        mockDataViewsService as unknown as DataViewsService,
        'index_name'
      )
    ).rejects.toEqual(new Error(ErrorCode.ANALYTICS_COLLECTION_ALREADY_EXISTS));
    expect(mockDataViewsService.createAndSave).not.toHaveBeenCalled();
  });
});
