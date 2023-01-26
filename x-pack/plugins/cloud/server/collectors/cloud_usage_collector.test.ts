/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createCollectorFetchContextMock,
  usageCollectionPluginMock,
} from '@kbn/usage-collection-plugin/server/mocks';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import { createCloudUsageCollector } from './cloud_usage_collector';
import { CollectorFetchContext } from '@kbn/usage-collection-plugin/server';

describe('createCloudUsageCollector', () => {
  let usageCollection: UsageCollectionSetup;
  let collectorFetchContext: jest.Mocked<CollectorFetchContext>;

  beforeEach(() => {
    usageCollection = usageCollectionPluginMock.createSetupContract();
    collectorFetchContext = createCollectorFetchContextMock();
  });

  it('calls `makeUsageCollector`', () => {
    createCloudUsageCollector(usageCollection, { isCloudEnabled: false });
    expect(usageCollection.makeUsageCollector).toBeCalledTimes(1);
  });

  describe('Fetched Usage data', () => {
    it('return isCloudEnabled boolean', async () => {
      const collector = createCloudUsageCollector(usageCollection, { isCloudEnabled: true });

      expect(await collector.fetch(collectorFetchContext)).toStrictEqual({
        isCloudEnabled: true,
        isElasticStaffOwned: undefined,
        trialEndDate: undefined,
      });
    });

    it('return inTrial boolean if trialEndDateIsProvided', async () => {
      const collector = createCloudUsageCollector(usageCollection, {
        isCloudEnabled: true,
        trialEndDate: '2020-10-01T14:30:16Z',
      });

      expect(await collector.fetch(collectorFetchContext)).toStrictEqual({
        isCloudEnabled: true,
        isElasticStaffOwned: undefined,
        trialEndDate: '2020-10-01T14:30:16Z',
        inTrial: false,
      });
    });
  });
});
