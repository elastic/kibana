/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of } from 'rxjs';
import {
  createCollectorFetchContextMock,
  usageCollectionPluginMock,
} from '@kbn/usage-collection-plugin/server/mocks';
import type {
  UsageCollectionSetup,
  CollectorFetchContext,
} from '@kbn/usage-collection-plugin/server';
import { createCloudUsageCollector } from './cloud_usage_collector';

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

    it('return inTrial and isPaying based on the provided observables', async () => {
      const collector = createCloudUsageCollector(usageCollection, {
        isCloudEnabled: true,
        isElasticStaffOwned: false,
        trialEndDate: new Date('2020-10-01T14:30:16Z'),
        inTrial$: of(false),
        isPaying$: of(true),
      });

      expect(await collector.fetch(collectorFetchContext)).toStrictEqual({
        isCloudEnabled: true,
        isElasticStaffOwned: false,
        trialEndDate: '2020-10-01T14:30:16.000Z',
        inTrial: false,
        isPaying: true,
      });
    });
  });
});
