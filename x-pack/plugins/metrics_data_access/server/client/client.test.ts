/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { MetricsDataClient } from './client';
import { metricsDataSourceSavedObjectName } from '../saved_objects/metrics_data_source';

describe('MetricsDataClient', () => {
  const client = new MetricsDataClient();

  client.setDefaultMetricIndicesHandler(async () => {
    return 'fallback-indices*';
  });

  describe('metric indices', () => {
    it('retrieves metrics saved object', async () => {
      const savedObjectsClient = {
        get: jest.fn().mockResolvedValue({ attributes: { metricIndices: 'foo,bar' } }),
      };

      const indices = await client.getMetricIndices({
        savedObjectsClient: savedObjectsClient as unknown as SavedObjectsClientContract,
      });

      expect(savedObjectsClient.get.mock.calls.length).toEqual(1);
      expect(savedObjectsClient.get.mock.calls[0]).toEqual([
        metricsDataSourceSavedObjectName,
        'default',
      ]);
      expect(indices).toEqual('foo,bar');
    });

    it('falls back to provided handler when no metrics saved object exists', async () => {
      const savedObjectsClient = {
        get: jest.fn().mockRejectedValue(SavedObjectsErrorHelpers.createGenericNotFoundError()),
      };

      const indices = await client.getMetricIndices({
        savedObjectsClient: savedObjectsClient as unknown as SavedObjectsClientContract,
      });

      expect(savedObjectsClient.get.mock.calls.length).toEqual(1);
      expect(savedObjectsClient.get.mock.calls[0]).toEqual([
        metricsDataSourceSavedObjectName,
        'default',
      ]);
      expect(indices).toEqual('fallback-indices*');
    });
  });
});
