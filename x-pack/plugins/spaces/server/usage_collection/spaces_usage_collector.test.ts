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
import { pluginInitializerContextConfigMock } from 'src/core/server/mocks';
import { createCollectorFetchContextMock } from 'src/plugins/usage_collection/server/mocks';

interface SetupOpts {
  license?: Partial<ILicense>;
  features?: KibanaFeature[];
}

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

  return {
    licensing,
    features: featuresSetup,
    usageCollecion: {
      makeUsageCollector: (options: any) => new MockUsageCollector(options),
    },
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
    const { features, licensing, usageCollecion } = setup({
      license: { isAvailable: true, type: 'basic' },
    });
    const { fetch: getSpacesUsage } = getSpacesUsageCollector(usageCollecion as any, {
      kibanaIndexConfig$: Rx.of({ kibana: { index: '.kibana' } }),
      features,
      licensing,
    });

    await getSpacesUsage(getMockFetchContext(jest.fn().mockRejectedValue({ status: 404 })));
  });

  it('throws error for a non-404', async () => {
    const { features, licensing, usageCollecion } = setup({
      license: { isAvailable: true, type: 'basic' },
    });
    const { fetch: getSpacesUsage } = getSpacesUsageCollector(usageCollecion as any, {
      kibanaIndexConfig$: Rx.of({ kibana: { index: '.kibana' } }),
      features,
      licensing,
    });

    const statusCodes = [401, 402, 403, 500];
    for (const statusCode of statusCodes) {
      const error = { status: statusCode };
      await expect(
        getSpacesUsage(getMockFetchContext(jest.fn().mockRejectedValue(error)))
      ).rejects.toBe(error);
    }
  });
});

describe('with a basic license', () => {
  let usageStats: UsageStats;
  beforeAll(async () => {
    const { features, licensing, usageCollecion } = setup({
      license: { isAvailable: true, type: 'basic' },
    });
    const { fetch: getSpacesUsage } = getSpacesUsageCollector(usageCollecion as any, {
      kibanaIndexConfig$: pluginInitializerContextConfigMock({}).legacy.globalConfig$,
      features,
      licensing,
    });
    usageStats = await getSpacesUsage(getMockFetchContext(defaultCallClusterMock));

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
});

describe('with no license', () => {
  let usageStats: UsageStats;
  beforeAll(async () => {
    const { features, licensing, usageCollecion } = setup({ license: { isAvailable: false } });
    const { fetch: getSpacesUsage } = getSpacesUsageCollector(usageCollecion as any, {
      kibanaIndexConfig$: pluginInitializerContextConfigMock({}).legacy.globalConfig$,
      features,
      licensing,
    });
    usageStats = await getSpacesUsage(getMockFetchContext(defaultCallClusterMock));
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
});

describe('with platinum license', () => {
  let usageStats: UsageStats;
  beforeAll(async () => {
    const { features, licensing, usageCollecion } = setup({
      license: { isAvailable: true, type: 'platinum' },
    });
    const { fetch: getSpacesUsage } = getSpacesUsageCollector(usageCollecion as any, {
      kibanaIndexConfig$: pluginInitializerContextConfigMock({}).legacy.globalConfig$,
      features,
      licensing,
    });
    usageStats = await getSpacesUsage(getMockFetchContext(defaultCallClusterMock));
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
});
