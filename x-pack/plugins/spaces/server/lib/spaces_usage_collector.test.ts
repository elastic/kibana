/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getSpacesUsageCollector, UsageStats } from './spaces_usage_collector';
import * as Rx from 'rxjs';
import { PluginsSetup } from '../plugin';
import { Feature } from '../../../features/server';
import { ILicense, LicensingPluginSetup } from '../../../licensing/server';

interface SetupOpts {
  license?: Partial<ILicense>;
  features?: Feature[];
}

function setup({
  license = { isAvailable: true },
  features = [{ id: 'feature1' } as Feature, { id: 'feature2' } as Feature],
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
    getFeatures: jest.fn().mockReturnValue(features),
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

describe('with a basic license', () => {
  let usageStats: UsageStats;
  beforeAll(async () => {
    const { features, licensing, usageCollecion } = setup({
      license: { isAvailable: true, type: 'basic' },
    });
    const { fetch: getSpacesUsage } = getSpacesUsageCollector(usageCollecion as any, {
      kibanaIndex: '.kibana',
      features,
      licensing,
    });
    usageStats = await getSpacesUsage(defaultCallClusterMock);
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
      kibanaIndex: '.kibana',
      features,
      licensing,
    });
    usageStats = await getSpacesUsage(defaultCallClusterMock);
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
      kibanaIndex: '.kibana',
      features,
      licensing,
    });
    usageStats = await getSpacesUsage(defaultCallClusterMock);
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
