/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createCloudUsageCollector } from './cloud_usage_collector';

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
    it('return isCloudEnabled boolean', () => {
      const mockConfigs = getMockConfigs(true);
      const usageCollection = mockUsageCollection() as any;
      const collector = createCloudUsageCollector(usageCollection, mockConfigs);

      expect(collector.fetch().isCloudEnabled).toBe(true);
    });
  });
});
