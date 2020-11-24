/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getSpacesUsageCollector, UsageData } from './spaces_usage_collector';
import * as Rx from 'rxjs';
import { PluginsSetup } from '../plugin';
import { KibanaFeature } from '../../../features/server';
import { ILicense, LicensingPluginSetup } from '../../../licensing/server';
import { UsageStats } from '../usage_stats';
import { usageStatsClientMock } from '../usage_stats/usage_stats_client.mock';
import { usageStatsServiceMock } from '../usage_stats/usage_stats_service.mock';
import { pluginInitializerContextConfigMock } from 'src/core/server/mocks';
import { createCollectorFetchContextMock } from 'src/plugins/usage_collection/server/mocks';

interface SetupOpts {
  license?: Partial<ILicense>;
  features?: KibanaFeature[];
}

const MOCK_USAGE_STATS: UsageStats = {
  apiCalls: {
    copySavedObjects: {
      total: 5,
      createNewCopiesEnabled: { yes: 2, no: 3 },
      overwriteEnabled: { yes: 1, no: 4 },
    },
    resolveCopySavedObjectsErrors: {
      total: 13,
      createNewCopiesEnabled: { yes: 6, no: 7 },
    },
  },
};

function setup({
  license = { isAvailable: true },
  features = [{ id: 'feature1' } as KibanaFeature, { id: 'feature2' } as KibanaFeature],
}: SetupOpts = {}) {
  class MockUsageCollector {
    private fetch: any;

    constructor({ fetch }: any) {
      this.fetch = fetch;
    }
    // to make typescript happy
    public fakeFetchUsage() {
      return this.fetch;
    }
  }

  const licensing = {
    license$: Rx.of(license),
  } as LicensingPluginSetup;

  const featuresSetup = ({
    getKibanaFeatures: jest.fn().mockReturnValue(features),
  } as unknown) as PluginsSetup['features'];

  const usageStatsClient = usageStatsClientMock.create();
  usageStatsClient.getUsageStats.mockResolvedValue(MOCK_USAGE_STATS);
  const usageStatsService = usageStatsServiceMock.createSetupContract(usageStatsClient);

  return {
    licensing,
    features: featuresSetup,
    usageCollection: {
      makeUsageCollector: (options: any) => new MockUsageCollector(options),
    },
    usageStatsService,
    usageStatsClient,
  };
}

const defaultCallClusterMock = jest.fn().mockResolvedValue({
  hits: {
    total: {
      value: 2,
    },
  },
  aggregations: {
    disabledFeatures: {
      buckets: [
        {
          key: 'feature1',
          doc_count: 1,
        },
      ],
    },
  },
});

const getMockFetchContext = (mockedCallCluster: jest.Mock) => {
  return {
    ...createCollectorFetchContextMock(),
    callCluster: mockedCallCluster,
  };
};

describe('error handling', () => {
  it('handles a 404 when searching for space usage', async () => {
    const { features, licensing, usageCollection, usageStatsService } = setup({
      license: { isAvailable: true, type: 'basic' },
    });
    const collector = getSpacesUsageCollector(usageCollection as any, {
      kibanaIndexConfig$: Rx.of({ kibana: { index: '.kibana' } }),
      features,
      licensing,
      usageStatsServicePromise: Promise.resolve(usageStatsService),
    });

    await collector.fetch(getMockFetchContext(jest.fn().mockRejectedValue({ status: 404 })));
  });

  it('throws error for a non-404', async () => {
    const { features, licensing, usageCollection, usageStatsService } = setup({
      license: { isAvailable: true, type: 'basic' },
    });
    const collector = getSpacesUsageCollector(usageCollection as any, {
      kibanaIndexConfig$: Rx.of({ kibana: { index: '.kibana' } }),
      features,
      licensing,
      usageStatsServicePromise: Promise.resolve(usageStatsService),
    });

    const statusCodes = [401, 402, 403, 500];
    for (const statusCode of statusCodes) {
      const error = { status: statusCode };
      await expect(
        collector.fetch(getMockFetchContext(jest.fn().mockRejectedValue(error)))
      ).rejects.toBe(error);
    }
  });
});

describe('with a basic license', () => {
  let usageData: UsageData;
  const { features, licensing, usageCollection, usageStatsService, usageStatsClient } = setup({
    license: { isAvailable: true, type: 'basic' },
  });

  beforeAll(async () => {
    const collector = getSpacesUsageCollector(usageCollection as any, {
      kibanaIndexConfig$: pluginInitializerContextConfigMock({}).legacy.globalConfig$,
      features,
      licensing,
      usageStatsServicePromise: Promise.resolve(usageStatsService),
    });
    usageData = await collector.fetch(getMockFetchContext(defaultCallClusterMock));

    expect(defaultCallClusterMock).toHaveBeenCalledWith('search', {
      body: {
        aggs: {
          disabledFeatures: {
            terms: { field: 'space.disabledFeatures', include: ['feature1', 'feature2'], size: 2 },
          },
        },
        query: { term: { type: { value: 'space' } } },
        size: 0,
        track_total_hits: true,
      },
      index: '.kibana-tests',
    });
  });

  test('sets enabled to true', () => {
    expect(usageData.enabled).toBe(true);
  });

  test('sets available to true', () => {
    expect(usageData.available).toBe(true);
  });

  test('sets the number of spaces', () => {
    expect(usageData.count).toBe(2);
  });

  test('calculates feature control usage', () => {
    expect(usageData.usesFeatureControls).toBe(true);
    expect(usageData).toHaveProperty('disabledFeatures');
    expect(usageData.disabledFeatures).toEqual({
      feature1: 1,
      feature2: 0,
    });
  });

  test('fetches usageStats data', () => {
    expect(usageStatsService.getClient).toHaveBeenCalledTimes(1);
    expect(usageStatsClient.getUsageStats).toHaveBeenCalledTimes(1);
    expect(usageData).toEqual(expect.objectContaining(MOCK_USAGE_STATS));
  });
});

describe('with no license', () => {
  let usageData: UsageData;
  const { features, licensing, usageCollection, usageStatsService, usageStatsClient } = setup({
    license: { isAvailable: false },
  });

  beforeAll(async () => {
    const collector = getSpacesUsageCollector(usageCollection as any, {
      kibanaIndexConfig$: pluginInitializerContextConfigMock({}).legacy.globalConfig$,
      features,
      licensing,
      usageStatsServicePromise: Promise.resolve(usageStatsService),
    });
    usageData = await collector.fetch(getMockFetchContext(defaultCallClusterMock));
  });

  test('sets enabled to false', () => {
    expect(usageData.enabled).toBe(false);
  });

  test('sets available to false', () => {
    expect(usageData.available).toBe(false);
  });

  test('does not set the number of spaces', () => {
    expect(usageData.count).toBeUndefined();
  });

  test('does not set feature control usage', () => {
    expect(usageData.usesFeatureControls).toBeUndefined();
  });

  test('does not fetch usageStats data', () => {
    expect(usageStatsService.getClient).not.toHaveBeenCalled();
    expect(usageStatsClient.getUsageStats).not.toHaveBeenCalled();
    expect(usageData).not.toEqual(expect.objectContaining(MOCK_USAGE_STATS));
  });
});

describe('with platinum license', () => {
  let usageData: UsageData;
  const { features, licensing, usageCollection, usageStatsService, usageStatsClient } = setup({
    license: { isAvailable: true, type: 'platinum' },
  });

  beforeAll(async () => {
    const collector = getSpacesUsageCollector(usageCollection as any, {
      kibanaIndexConfig$: pluginInitializerContextConfigMock({}).legacy.globalConfig$,
      features,
      licensing,
      usageStatsServicePromise: Promise.resolve(usageStatsService),
    });
    usageData = await collector.fetch(getMockFetchContext(defaultCallClusterMock));
  });

  test('sets enabled to true', () => {
    expect(usageData.enabled).toBe(true);
  });

  test('sets available to true', () => {
    expect(usageData.available).toBe(true);
  });

  test('sets the number of spaces', () => {
    expect(usageData.count).toBe(2);
  });

  test('calculates feature control usage', () => {
    expect(usageData.usesFeatureControls).toBe(true);
    expect(usageData.disabledFeatures).toEqual({
      feature1: 1,
      feature2: 0,
    });
  });

  test('fetches usageStats data', () => {
    expect(usageStatsService.getClient).toHaveBeenCalledTimes(1);
    expect(usageStatsClient.getUsageStats).toHaveBeenCalledTimes(1);
    expect(usageData).toEqual(expect.objectContaining(MOCK_USAGE_STATS));
  });
});
