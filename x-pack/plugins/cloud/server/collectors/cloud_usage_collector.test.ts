/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createCloudUsageCollector } from './cloud_usage_collector';
import { createCollectorFetchContextMock } from '@kbn/usage-collection-plugin/server/mocks';

const mockUsageCollection = () => ({
  makeUsageCollector: jest.fn().mockImplementation((args: any) => ({ ...args })),
});

const getMockConfigs = (isCloudEnabled: boolean) => ({ isCloudEnabled });

describe('createCloudUsageCollector', () => {
  it('calls `makeUsageCollector`', () => {
    const mockConfigs = getMockConfigs(false);
    const usageCollection = mockUsageCollection();
    createCloudUsageCollector(usageCollection as any, mockConfigs);
    expect(usageCollection.makeUsageCollector).toBeCalledTimes(1);
  });

  describe('Fetched Usage data', () => {
    it('return isCloudEnabled boolean', async () => {
      const mockConfigs = getMockConfigs(true);
      const usageCollection = mockUsageCollection() as any;
      const collector = createCloudUsageCollector(usageCollection, mockConfigs);
      const collectorFetchContext = createCollectorFetchContextMock();

      expect((await collector.fetch(collectorFetchContext)).isCloudEnabled).toBe(true); // Adding the await because the fetch can be a Promise or a synchronous method and TS complains in the test if not awaited
    });
  });
});
