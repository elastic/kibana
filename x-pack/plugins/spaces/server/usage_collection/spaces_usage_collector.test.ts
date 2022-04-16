/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as Rx from 'rxjs';

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import type { KibanaFeature } from '@kbn/features-plugin/server';
import type { ILicense, LicensingPluginSetup } from '@kbn/licensing-plugin/server';
import { createCollectorFetchContextMock } from '@kbn/usage-collection-plugin/server/mocks';

import type { PluginsSetup } from '../plugin';
import type { UsageStats } from '../usage_stats';
import { usageStatsClientMock } from '../usage_stats/usage_stats_client.mock';
import { usageStatsServiceMock } from '../usage_stats/usage_stats_service.mock';
import type { UsageData } from './spaces_usage_collector';
import { getSpacesUsageCollector } from './spaces_usage_collector';

interface SetupOpts {
  license?: Partial<ILicense>;
  features?: KibanaFeature[];
}

const MOCK_USAGE_STATS: UsageStats = {
  'apiCalls.copySavedObjects.total': 5,
  'apiCalls.copySavedObjects.kibanaRequest.yes': 5,
  'apiCalls.copySavedObjects.kibanaRequest.no': 0,
  'apiCalls.copySavedObjects.createNewCopiesEnabled.yes': 2,
  'apiCalls.copySavedObjects.createNewCopiesEnabled.no': 3,
  'apiCalls.copySavedObjects.overwriteEnabled.yes': 1,
  'apiCalls.copySavedObjects.overwriteEnabled.no': 4,
  'apiCalls.resolveCopySavedObjectsErrors.total': 13,
  'apiCalls.resolveCopySavedObjectsErrors.kibanaRequest.yes': 13,
  'apiCalls.resolveCopySavedObjectsErrors.kibanaRequest.no': 0,
  'apiCalls.resolveCopySavedObjectsErrors.createNewCopiesEnabled.yes': 6,
  'apiCalls.resolveCopySavedObjectsErrors.createNewCopiesEnabled.no': 7,
  'apiCalls.disableLegacyUrlAliases.total': 17,
};

const kibanaIndex = '.kibana-tests';

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

  const featuresSetup = {
    getKibanaFeatures: jest.fn().mockReturnValue(features),
  } as unknown as PluginsSetup['features'];

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

const getMockFetchContext = (mockedEsClient: any) => {
  return {
    ...createCollectorFetchContextMock(),
    esClient: mockedEsClient,
  };
};

const getMockedEsClient = () => {
  const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
  esClient.search.mockResponse({
    hits: {
      // @ts-expect-error incomplete definition
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
  return esClient;
};

describe('error handling', () => {
  it('throws error if cluster unavailable', async () => {
    const { features, licensing, usageCollection, usageStatsService } = setup({
      license: { isAvailable: true, type: 'basic' },
    });
    const collector = getSpacesUsageCollector(usageCollection as any, {
      kibanaIndex,
      features,
      licensing,
      usageStatsServicePromise: Promise.resolve(usageStatsService),
    });
    const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

    const statusCodes = [401, 402, 403, 404, 500];
    for (const statusCode of statusCodes) {
      const error = { status: statusCode };
      esClient.search.mockRejectedValue(error);
      await expect(collector.fetch(getMockFetchContext(esClient))).rejects.toBe(error);
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
      kibanaIndex,
      features,
      licensing,
      usageStatsServicePromise: Promise.resolve(usageStatsService),
    });
    const esClient = getMockedEsClient();
    usageData = await collector.fetch(getMockFetchContext(esClient));

    expect(esClient.search).toHaveBeenCalledWith({
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
      index: kibanaIndex,
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
      kibanaIndex,
      features,
      licensing,
      usageStatsServicePromise: Promise.resolve(usageStatsService),
    });
    const esClient = getMockedEsClient();

    usageData = await collector.fetch(getMockFetchContext(esClient));
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
      kibanaIndex,
      features,
      licensing,
      usageStatsServicePromise: Promise.resolve(usageStatsService),
    });
    const esClient = getMockedEsClient();

    usageData = await collector.fetch(getMockFetchContext(esClient));
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
