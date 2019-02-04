/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getSpacesUsageCollector, UsageStats } from './get_spaces_usage_collector';

function getServerMock(customization?: any) {
  class MockUsageCollector {
    private fetch: any;

    constructor(server: any, { fetch }: any) {
      this.fetch = fetch;
    }
    // to make typescript happy
    public fakeFetchUsage() {
      return this.fetch;
    }
  }

  const getLicenseCheckResults = jest.fn().mockReturnValue({});
  const defaultServerMock = {
    plugins: {
      security: {
        isAuthenticated: jest.fn().mockReturnValue(true),
      },
      xpack_main: {
        info: {
          isAvailable: jest.fn().mockReturnValue(true),
          feature: () => ({
            getLicenseCheckResults,
          }),
          license: {
            isOneOf: jest.fn().mockReturnValue(false),
            getType: jest.fn().mockReturnValue('platinum'),
          },
          toJSON: () => ({ b: 1 }),
        },
      },
    },
    expose: () => {
      return;
    },
    log: () => {
      return;
    },
    config: () => ({
      get: (key: string) => {
        if (key === 'xpack.spaces.enabled') {
          return true;
        }
      },
    }),
    usage: {
      collectorSet: {
        makeUsageCollector: (options: any) => {
          return new MockUsageCollector(defaultServerMock, options);
        },
      },
    },
    savedObjects: {
      getSavedObjectsRepository: jest.fn(() => {
        return {
          find() {
            return {
              saved_objects: ['a', 'b'],
            };
          },
        };
      }),
    },
  };
  return Object.assign(defaultServerMock, customization);
}

test('sets enabled to false when spaces is turned off', async () => {
  const mockConfigGet = jest.fn(key => {
    if (key === 'xpack.spaces.enabled') {
      return false;
    } else if (key.indexOf('xpack.spaces') >= 0) {
      throw new Error('Unknown config key!');
    }
  });
  const serverMock = getServerMock({ config: () => ({ get: mockConfigGet }) });
  const callClusterMock = jest.fn();
  const { fetch: getSpacesUsage } = getSpacesUsageCollector(serverMock);
  const usageStats: UsageStats = await getSpacesUsage(callClusterMock);
  expect(usageStats.enabled).toBe(false);
});

describe('with a basic license', async () => {
  let usageStats: UsageStats;
  beforeAll(async () => {
    const serverWithBasicLicenseMock = getServerMock();
    serverWithBasicLicenseMock.plugins.xpack_main.info.license.getType = jest
      .fn()
      .mockReturnValue('basic');
    const callClusterMock = jest.fn(() => Promise.resolve({}));
    const { fetch: getSpacesUsage } = getSpacesUsageCollector(serverWithBasicLicenseMock);
    usageStats = await getSpacesUsage(callClusterMock);
  });

  test('sets enabled to true', async () => {
    expect(usageStats.enabled).toBe(true);
  });

  test('sets available to true', async () => {
    expect(usageStats.available).toBe(true);
  });

  test('sets the number of spaces', async () => {
    expect(usageStats.count).toBe(2);
  });
});

describe('with no license', async () => {
  let usageStats: UsageStats;
  beforeAll(async () => {
    const serverWithNoLicenseMock = getServerMock();
    serverWithNoLicenseMock.plugins.xpack_main.info.isAvailable = jest.fn().mockReturnValue(false);
    const callClusterMock = jest.fn(() => Promise.resolve({}));
    const { fetch: getSpacesUsage } = getSpacesUsageCollector(serverWithNoLicenseMock);
    usageStats = await getSpacesUsage(callClusterMock);
  });

  test('sets enabled to false', async () => {
    expect(usageStats.enabled).toBe(false);
  });

  test('sets available to false', async () => {
    expect(usageStats.available).toBe(false);
  });

  test('does not set the number of spaces', async () => {
    expect(usageStats.count).toBeUndefined();
  });
});

describe('with platinum license', async () => {
  let usageStats: UsageStats;
  beforeAll(async () => {
    const serverWithPlatinumLicenseMock = getServerMock();
    serverWithPlatinumLicenseMock.plugins.xpack_main.info.license.getType = jest
      .fn()
      .mockReturnValue('platinum');
    const callClusterMock = jest.fn(() => Promise.resolve({}));
    const { fetch: getSpacesUsage } = getSpacesUsageCollector(serverWithPlatinumLicenseMock);
    usageStats = await getSpacesUsage(callClusterMock);
  });

  test('sets enabled to true', async () => {
    expect(usageStats.enabled).toBe(true);
  });

  test('sets available to true', async () => {
    expect(usageStats.available).toBe(true);
  });

  test('sets the number of spaces', async () => {
    expect(usageStats.count).toBe(2);
  });
});
