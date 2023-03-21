/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core-elasticsearch-server';

import { analyticsEventsIndexExists } from './analytics_events_index_exists';

describe('analytics collection events exists function', () => {
  const mockClient = {
    asCurrentUser: {
      indices: {
        getDataStream: jest.fn(),
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('checking if analytics events index exists', () => {
    it('should call exists endpoint', async () => {
      mockClient.asCurrentUser.indices.getDataStream.mockImplementationOnce(() => ({
        data_streams: [{ name: 'example' }],
      }));
      await expect(
        analyticsEventsIndexExists(mockClient as unknown as IScopedClusterClient, 'example')
      ).resolves.toEqual(true);
      expect(mockClient.asCurrentUser.indices.getDataStream).toHaveBeenCalledWith({
        name: 'example',
      });
    });
  });
});
