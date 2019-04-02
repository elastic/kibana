/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import sinon from 'sinon';
import { getReportingUsageCollector } from './get_reporting_usage_collector';

function getServerMock(customization) {
  class MockUsageCollector {
    constructor(_server, { fetch }) {
      this.fetch = fetch;
    }
  }

  const getLicenseCheckResults = sinon.stub().returns({});
  const defaultServerMock = {
    plugins: {
      security: {
        isAuthenticated: sinon.stub().returns(true),
      },
      xpack_main: {
        info: {
          isAvailable: sinon.stub().returns(true),
          feature: () => ({
            getLicenseCheckResults,
          }),
          license: {
            isOneOf: sinon.stub().returns(false),
            getType: sinon.stub().returns('platinum'),
          },
          toJSON: () => ({ b: 1 }),
        },
      },
    },
    expose: () => {},
    log: () => {},
    config: () => ({
      get: key => {
        if (key === 'xpack.reporting.enabled') {
          return true;
        } else if (key === 'xpack.reporting.index') {
          return '.reporting-index';
        }
      },
    }),
    usage: {
      collectorSet: {
        makeUsageCollector: options => {
          return new MockUsageCollector(this, options);
        },
      },
    },
  };
  return Object.assign(defaultServerMock, customization);
}

const getResponseMock = () => ({
  aggregations: {
    ranges: {
      meta: {},
      buckets: {
        all: {
          doc_count: 22,
          layoutTypes: {
            doc_count: 7,
            pdf: { buckets: [{ key: 'preserve_layout', doc_count: 7 }] },
          },
          objectTypes: { doc_count: 7, pdf: { buckets: [{ key: 'dashboard', doc_count: 7 }] } },
          statusTypes: {
            buckets: [{ key: 'pending', doc_count: 16 }, { key: 'completed', doc_count: 6 }],
          },
          jobTypes: {
            buckets: [{ key: 'csv', doc_count: 15 }, { key: 'printable_pdf', doc_count: 7 }],
          },
        },
        last1: {
          doc_count: 15,
          jobTypes: {
            buckets: [{ key: 'csv', doc_count: 15 }],
          },
        },
        last7: {
          doc_count: 16,
          layoutTypes: {
            doc_count: 1,
            pdf: { buckets: [{ key: 'preserve_layout', doc_count: 1 }] },
          },
          objectTypes: { doc_count: 1, pdf: { buckets: [{ key: 'dashboard', doc_count: 1 }] } },
          statusTypes: {
            buckets: [{ key: 'completed', doc_count: 16 }],
          },
          jobTypes: {
            buckets: [{ key: 'csv', doc_count: 15 }, { key: 'printable_pdf', doc_count: 1 }],
          },
        },
      },
    },
  },
});

describe('with a basic license', async () => {
  let usageStats;
  beforeAll(async () => {
    const serverWithBasicLicenseMock = getServerMock();
    serverWithBasicLicenseMock.plugins.xpack_main.info.license.getType = sinon
      .stub()
      .returns('basic');
    const callClusterMock = jest.fn(() => Promise.resolve(getResponseMock()));
    const { fetch: getReportingUsage } = getReportingUsageCollector(serverWithBasicLicenseMock);
    usageStats = await getReportingUsage(callClusterMock);
  });

  test('sets enables to true', async () => {
    expect(usageStats.enabled).toBe(true);
  });

  test('sets csv available to true', async () => {
    expect(usageStats.csv.available).toBe(true);
  });

  test('sets pdf availability to false', async () => {
    expect(usageStats.printable_pdf.available).toBe(false);
  });
});

describe('with no license', async () => {
  let usageStats;
  beforeAll(async () => {
    const serverWithNoLicenseMock = getServerMock();
    serverWithNoLicenseMock.plugins.xpack_main.info.license.getType = sinon.stub().returns('none');
    const callClusterMock = jest.fn(() => Promise.resolve(getResponseMock()));
    const { fetch: getReportingUsage } = getReportingUsageCollector(serverWithNoLicenseMock);
    usageStats = await getReportingUsage(callClusterMock);
  });

  test('sets enables to true', async () => {
    expect(usageStats.enabled).toBe(true);
  });

  test('sets csv available to false', async () => {
    expect(usageStats.csv.available).toBe(false);
  });

  test('sets pdf availability to false', async () => {
    expect(usageStats.printable_pdf.available).toBe(false);
  });
});

describe('with platinum license', async () => {
  let usageStats;
  beforeAll(async () => {
    const serverWithPlatinumLicenseMock = getServerMock();
    serverWithPlatinumLicenseMock.plugins.xpack_main.info.license.getType = sinon
      .stub()
      .returns('platinum');
    const callClusterMock = jest.fn(() => Promise.resolve(getResponseMock()));
    const { fetch: getReportingUsage } = getReportingUsageCollector(serverWithPlatinumLicenseMock);
    usageStats = await getReportingUsage(callClusterMock);
  });

  test('sets enables to true', async () => {
    expect(usageStats.enabled).toBe(true);
  });

  test('sets csv available to true', async () => {
    expect(usageStats.csv.available).toBe(true);
  });

  test('sets pdf availability to true', async () => {
    expect(usageStats.printable_pdf.available).toBe(true);
  });
});

describe('with no usage data', async () => {
  let usageStats;
  beforeAll(async () => {
    const serverWithBasicLicenseMock = getServerMock();
    serverWithBasicLicenseMock.plugins.xpack_main.info.license.getType = sinon
      .stub()
      .returns('basic');
    const callClusterMock = jest.fn(() => Promise.resolve({}));
    const { fetch: getReportingUsage } = getReportingUsageCollector(serverWithBasicLicenseMock);
    usageStats = await getReportingUsage(callClusterMock);
  });

  test('sets enables to true', async () => {
    expect(usageStats.enabled).toBe(true);
  });

  test('sets csv available to true', async () => {
    expect(usageStats.csv.available).toBe(true);
  });
});
