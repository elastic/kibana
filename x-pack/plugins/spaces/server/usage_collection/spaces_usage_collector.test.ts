/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getSpacesUsageCollector, UsageStats } from './spaces_usage_collector';
import * as Rx from 'rxjs';
import { PluginsSetup } from '../plugin';
import { KibanaFeature } from '../../../features/server';
import { ILicense, LicensingPluginSetup } from '../../../licensing/server';
import { telemetryClientMock } from '../lib/telemetry_client/telemetry_client.mock';
import { SpacesTelemetry } from '../model/spaces_telemetry';
import { telemetryServiceMock } from '../telemetry_service/telemetry_service.mock';
import { pluginInitializerContextConfigMock } from 'src/core/server/mocks';
import { createCollectorFetchContextMock } from 'src/plugins/usage_collection/server/mocks';

interface SetupOpts {
  license?: Partial<ILicense>;
  features?: KibanaFeature[];
}

const MOCK_TELEMETRY_DATA: SpacesTelemetry = {
  apiCalls: {
    copySavedObjects: {
      total: 5,
      createNewCopies: { enabled: 2, disabled: 3 },
      overwrite: { enabled: 1, disabled: 4 },
    },
    resolveCopySavedObjectsErrors: {
      total: 13,
      createNewCopies: { enabled: 6, disabled: 7 },
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

  const telemetryClient = telemetryClientMock.create();
  telemetryClient.getTelemetryData.mockResolvedValue(MOCK_TELEMETRY_DATA);
  const telemetryService = telemetryServiceMock.createSetupContract(telemetryClient);

  return {
    licensing,
    features: featuresSetup,
    usageCollection: {
      makeUsageCollector: (options: any) => new MockUsageCollector(options),
    },
    telemetryService,
    telemetryClient,
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
    const { features, licensing, usageCollection, telemetryService } = setup({
      license: { isAvailable: true, type: 'basic' },
    });
    const collector = getSpacesUsageCollector(usageCollection as any, {
      kibanaIndexConfig$: Rx.of({ kibana: { index: '.kibana' } }),
      features,
      licensing,
      telemetryServicePromise: Promise.resolve(telemetryService),
    });

    await collector.fetch(getMockFetchContext(jest.fn().mockRejectedValue({ status: 404 })));
  });

  it('throws error for a non-404', async () => {
    const { features, licensing, usageCollection, telemetryService } = setup({
      license: { isAvailable: true, type: 'basic' },
    });
    const collector = getSpacesUsageCollector(usageCollection as any, {
      kibanaIndexConfig$: Rx.of({ kibana: { index: '.kibana' } }),
      features,
      licensing,
      telemetryServicePromise: Promise.resolve(telemetryService),
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
  let usageStats: UsageStats;
  const { features, licensing, usageCollection, telemetryService, telemetryClient } = setup({
    license: { isAvailable: true, type: 'basic' },
  });

  beforeAll(async () => {
    const collector = getSpacesUsageCollector(usageCollection as any, {
      kibanaIndexConfig$: pluginInitializerContextConfigMock({}).legacy.globalConfig$,
      features,
      licensing,
      telemetryServicePromise: Promise.resolve(telemetryService),
    });
    usageStats = await collector.fetch(getMockFetchContext(defaultCallClusterMock));

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
    expect(usageStats.enabled).toBe(true);
  });

  test('sets available to true', () => {
    expect(usageStats.available).toBe(true);
  });

  test('sets the number of spaces', () => {
    expect(usageStats.count).toBe(2);
  });

  test('calculates feature control usage', () => {
    expect(usageStats.usesFeatureControls).toBe(true);
    expect(usageStats).toHaveProperty('disabledFeatures');
    expect(usageStats.disabledFeatures).toEqual({
      feature1: 1,
      feature2: 0,
    });
  });

  test('fetches telemetry data', () => {
    expect(telemetryService.getClient).toHaveBeenCalledTimes(1);
    expect(telemetryClient.getTelemetryData).toHaveBeenCalledTimes(1);
    expect(usageStats).toEqual(expect.objectContaining(MOCK_TELEMETRY_DATA));
  });
});

describe('with no license', () => {
  let usageStats: UsageStats;
  const { features, licensing, usageCollection, telemetryService, telemetryClient } = setup({
    license: { isAvailable: false },
  });

  beforeAll(async () => {
    const collector = getSpacesUsageCollector(usageCollection as any, {
      kibanaIndexConfig$: pluginInitializerContextConfigMock({}).legacy.globalConfig$,
      features,
      licensing,
      telemetryServicePromise: Promise.resolve(telemetryService),
    });
    usageStats = await collector.fetch(getMockFetchContext(defaultCallClusterMock));
  });

  test('sets enabled to false', () => {
    expect(usageStats.enabled).toBe(false);
  });

  test('sets available to false', () => {
    expect(usageStats.available).toBe(false);
  });

  test('does not set the number of spaces', () => {
    expect(usageStats.count).toBeUndefined();
  });

  test('does not set feature control usage', () => {
    expect(usageStats.usesFeatureControls).toBeUndefined();
  });

  test('does not fetch telemetry data', () => {
    expect(telemetryService.getClient).not.toHaveBeenCalled();
    expect(telemetryClient.getTelemetryData).not.toHaveBeenCalled();
    expect(usageStats).not.toEqual(expect.objectContaining(MOCK_TELEMETRY_DATA));
  });
});

describe('with platinum license', () => {
  let usageStats: UsageStats;
  const { features, licensing, usageCollection, telemetryService, telemetryClient } = setup({
    license: { isAvailable: true, type: 'platinum' },
  });

  beforeAll(async () => {
    const collector = getSpacesUsageCollector(usageCollection as any, {
      kibanaIndexConfig$: pluginInitializerContextConfigMock({}).legacy.globalConfig$,
      features,
      licensing,
      telemetryServicePromise: Promise.resolve(telemetryService),
    });
    usageStats = await collector.fetch(getMockFetchContext(defaultCallClusterMock));
  });

  test('sets enabled to true', () => {
    expect(usageStats.enabled).toBe(true);
  });

  test('sets available to true', () => {
    expect(usageStats.available).toBe(true);
  });

  test('sets the number of spaces', () => {
    expect(usageStats.count).toBe(2);
  });

  test('calculates feature control usage', () => {
    expect(usageStats.usesFeatureControls).toBe(true);
    expect(usageStats.disabledFeatures).toEqual({
      feature1: 1,
      feature2: 0,
    });
  });

  test('fetches telemetry data', () => {
    expect(telemetryService.getClient).toHaveBeenCalledTimes(1);
    expect(telemetryClient.getTelemetryData).toHaveBeenCalledTimes(1);
    expect(usageStats).toEqual(expect.objectContaining(MOCK_TELEMETRY_DATA));
  });
});
