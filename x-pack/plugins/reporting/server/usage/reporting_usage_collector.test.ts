/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as Rx from 'rxjs';
import sinon from 'sinon';
import { CollectorFetchContext, UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { createCollectorFetchContextMock } from 'src/plugins/usage_collection/server/mocks';
import { ReportingCore } from '../';
import { getExportTypesRegistry } from '../lib/export_types_registry';
import { createMockConfigSchema, createMockReportingCore } from '../test_helpers';
import { ReportingSetupDeps } from '../types';
import { FeaturesAvailability } from './';
import {
  getReportingUsageCollector,
  registerReportingUsageCollector,
} from './reporting_usage_collector';

const exportTypesRegistry = getExportTypesRegistry();

function getMockUsageCollection() {
  class MockUsageCollector {
    // @ts-ignore fetch is not used
    private fetch: any;
    constructor(_server: any, { fetch }: any) {
      this.fetch = fetch;
    }
  }
  return {
    makeUsageCollector: (options: any) => {
      return new MockUsageCollector(null, options);
    },
    registerCollector: sinon.stub(),
  };
}

const getLicenseMock =
  (licenseType = 'gold') =>
  () => {
    return Promise.resolve({
      isAvailable: () => true,
      license: { getType: () => licenseType },
    } as FeaturesAvailability);
  };

function getPluginsMock(
  { license, usageCollection = getMockUsageCollection() } = { license: 'gold' }
) {
  return {
    licensing: { license$: Rx.of(getLicenseMock(license)) },
    usageCollection,
    elasticsearch: {},
    security: {},
  } as unknown as ReportingSetupDeps & { usageCollection: UsageCollectionSetup };
}

const getResponseMock = (base = {}) => base;

const getMockFetchClients = (resp: any) => {
  const fetchParamsMock = createCollectorFetchContextMock();
  fetchParamsMock.esClient.search = jest.fn().mockResolvedValue({ body: resp });
  return fetchParamsMock;
};
describe('license checks', () => {
  let mockCore: ReportingCore;
  beforeAll(async () => {
    mockCore = await createMockReportingCore(createMockConfigSchema());
  });

  describe('with a basic license', () => {
    let usageStats: any;
    beforeAll(async () => {
      const plugins = getPluginsMock({ license: 'basic' });
      const collector = getReportingUsageCollector(
        mockCore,
        plugins.usageCollection,
        getLicenseMock('basic'),
        exportTypesRegistry,
        function isReady() {
          return Promise.resolve(true);
        }
      );
      usageStats = await collector.fetch(getMockFetchClients(getResponseMock()));
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

  describe('with no license', () => {
    let usageStats: any;
    beforeAll(async () => {
      const plugins = getPluginsMock({ license: 'none' });
      const collector = getReportingUsageCollector(
        mockCore,
        plugins.usageCollection,
        getLicenseMock('none'),
        exportTypesRegistry,
        function isReady() {
          return Promise.resolve(true);
        }
      );
      usageStats = await collector.fetch(getMockFetchClients(getResponseMock()));
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

  describe('with gold license', () => {
    let usageStats: any;
    beforeAll(async () => {
      const plugins = getPluginsMock({ license: 'gold' });
      const collector = getReportingUsageCollector(
        mockCore,
        plugins.usageCollection,
        getLicenseMock('gold'),
        exportTypesRegistry,
        function isReady() {
          return Promise.resolve(true);
        }
      );
      usageStats = await collector.fetch(getMockFetchClients(getResponseMock()));
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

  describe('with no usage data', () => {
    let usageStats: any;
    beforeAll(async () => {
      const plugins = getPluginsMock({ license: 'basic' });
      const collector = getReportingUsageCollector(
        mockCore,
        plugins.usageCollection,
        getLicenseMock('basic'),
        exportTypesRegistry,
        function isReady() {
          return Promise.resolve(true);
        }
      );
      usageStats = await collector.fetch(getMockFetchClients({}));
    });

    test('sets enables to true', async () => {
      expect(usageStats.enabled).toBe(true);
    });

    test('sets csv available to true', async () => {
      expect(usageStats.csv.available).toBe(true);
    });
  });
});

describe('data modeling', () => {
  let mockCore: ReportingCore;
  let collectorFetchContext: CollectorFetchContext;
  beforeAll(async () => {
    mockCore = await createMockReportingCore(createMockConfigSchema());
  });
  test('with usage data from the reporting/archived_reports es archive', async () => {
    const plugins = getPluginsMock();
    const collector = getReportingUsageCollector(
      mockCore,
      plugins.usageCollection,
      getLicenseMock(),
      exportTypesRegistry,
      function isReady() {
        return Promise.resolve(true);
      }
    );
    collectorFetchContext = getMockFetchClients(
      getResponseMock({
        aggregations: {
          ranges: {
            meta: {},
            buckets: {
              all: {
                doc_count: 11,
                layoutTypes: { doc_count: 6, pdf: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [ { key: 'preserve_layout', doc_count: 5 }, { key: 'print', doc_count: 1 }, ] } },
                statusByApp: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [ { key: 'completed', doc_count: 6, jobTypes: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [ { key: 'csv_searchsource', doc_count: 3, appNames: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [ { key: 'search', doc_count: 3 }, ] } }, { key: 'printable_pdf', doc_count: 2, appNames: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [ { key: 'dashboard', doc_count: 2 }, ] } }, { key: 'csv', doc_count: 1, appNames: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [ { key: 'search', doc_count: 1 }, ] } }, ] } }, { key: 'completed_with_warnings', doc_count: 2, jobTypes: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [ { key: 'PNG', doc_count: 1, appNames: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [ { key: 'dashboard', doc_count: 1 }, ] } }, { key: 'printable_pdf', doc_count: 1, appNames: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [ { key: 'dashboard', doc_count: 1 }, ] } }, ] } }, { key: 'failed', doc_count: 2, jobTypes: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [ { key: 'printable_pdf', doc_count: 2, appNames: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [ { key: 'dashboard', doc_count: 2 }, ] } }, ] } }, { key: 'pending', doc_count: 1, jobTypes: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [ { key: 'printable_pdf', doc_count: 1, appNames: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [ { key: 'dashboard', doc_count: 1 }, ] } }, ] } }, ] },
                objectTypes: { doc_count: 6, pdf: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [ { key: 'dashboard', doc_count: 6 }, ] } },
                statusTypes: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [ { key: 'completed', doc_count: 6 }, { key: 'completed_with_warnings', doc_count: 2 }, { key: 'failed', doc_count: 2 }, { key: 'pending', doc_count: 1 }, ] },
                jobTypes: { meta: {}, doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [ { key: 'printable_pdf', doc_count: 6, isDeprecated: { meta: {}, doc_count: 0 }, sizeMax: { value: 1713303.0 }, sizeAvg: { value: 957215.0 }, sizeMin: { value: 43226.0 } }, { key: 'csv_searchsource', doc_count: 3, isDeprecated: { meta: {}, doc_count: 0 }, sizeMax: { value: 7557.0 }, sizeAvg: { value: 3684.6666666666665 }, sizeMin: { value: 204.0 } }, { key: 'PNG', doc_count: 1, isDeprecated: { meta: {}, doc_count: 0 }, sizeMax: { value: 37748.0 }, sizeAvg: { value: 37748.0 }, sizeMin: { value: 37748.0 } }, { key: 'csv', doc_count: 1, isDeprecated: { meta: {}, doc_count: 0 }, sizeMax: { value: 231.0 }, sizeAvg: { value: 231.0 }, sizeMin: { value: 231.0 } }, ] },
                sizeMax: { value: 1713303.0 },
                sizeMin: { value: 204.0 },
                sizeAvg: { value: 365084.75 },
              },
              last7Days: {
                doc_count: 0,
                layoutTypes: { doc_count: 0, pdf: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [] } },
                statusByApp: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [] },
                objectTypes: { doc_count: 0, pdf: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [] } },
                statusTypes: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [] },
                jobTypes: { meta: {}, doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [] },
                sizeMax: { value: null },
                sizeMin: { value: null },
                sizeAvg: { value: null },
              },
            },
          }, // prettier-ignore
        },
      })
    );
    const usageStats = await collector.fetch(collectorFetchContext);
    expect(usageStats).toMatchSnapshot();
  });

  test('usage data with meta.isDeprecated jobTypes', async () => {
    const plugins = getPluginsMock();
    const collector = getReportingUsageCollector(
      mockCore,
      plugins.usageCollection,
      getLicenseMock(),
      exportTypesRegistry,
      function isReady() {
        return Promise.resolve(true);
      }
    );
    collectorFetchContext = getMockFetchClients(
      getResponseMock({
        aggregations: {
          ranges: {
            buckets: {
              all: {
                doc_count: 9,
                layoutTypes: { doc_count: 0, pdf: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [] } },
                statusByApp: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [ { key: 'completed', doc_count: 9, jobTypes: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [ { key: 'csv_searchsource', doc_count: 5, appNames: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [{ key: 'search', doc_count: 5 }] } }, { key: 'csv', doc_count: 4, appNames: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [{ key: 'search', doc_count: 4 }] } }, ] } }, ] },
                objectTypes: { doc_count: 0, pdf: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [] } },
                statusTypes: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [{ key: 'completed', doc_count: 9 }] },
                jobTypes: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [ { key: 'csv_searchsource', doc_count: 5, isDeprecated: { doc_count: 0 } }, { key: 'csv', doc_count: 4, isDeprecated: { doc_count: 4 } }, ] },
              },
              last7Days: {
                doc_count: 9,
                layoutTypes: { doc_count: 0, pdf: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [] } },
                statusByApp: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [ { key: 'completed', doc_count: 9, jobTypes: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [ { key: 'csv_searchsource', doc_count: 5, appNames: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [{ key: 'search', doc_count: 5 }] } }, { key: 'csv', doc_count: 4, appNames: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [{ key: 'search', doc_count: 4 }] } }, ] } }, ] },
                objectTypes: { doc_count: 0, pdf: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [] } },
                statusTypes: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [{ key: 'completed', doc_count: 9 }] },
                jobTypes: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [ { key: 'csv_searchsource', doc_count: 5, isDeprecated: { doc_count: 0 } }, { key: 'csv', doc_count: 4, isDeprecated: { doc_count: 4 } }, ] },
              },
            }, // prettier-ignore
          },
        },
      })
    );
    const usageStats = await collector.fetch(collectorFetchContext);
    expect(usageStats).toMatchSnapshot();
  });

  test('with sparse data', async () => {
    const plugins = getPluginsMock();
    const collector = getReportingUsageCollector(
      mockCore,
      plugins.usageCollection,
      getLicenseMock(),
      exportTypesRegistry,
      function isReady() {
        return Promise.resolve(true);
      }
    );
    collectorFetchContext = getMockFetchClients(
      getResponseMock({
        aggregations: {
          ranges: {
            buckets: {
              all: {
                doc_count: 4,
                layoutTypes: { doc_count: 2, pdf: { buckets: [{ key: 'preserve_layout', doc_count: 2 }] } },
                statusByApp: { buckets: [ { key: 'completed', doc_count: 4, jobTypes: { buckets: [ { key: 'printable_pdf', doc_count: 2, appNames: { buckets: [ { key: 'canvas workpad', doc_count: 1 }, { key: 'dashboard', doc_count: 1 }, ] } }, { key: 'PNG', doc_count: 1, appNames: { buckets: [{ key: 'dashboard', doc_count: 1 }] } }, { key: 'csv', doc_count: 1, appNames: { buckets: [] } }, ] } }, ] },
                objectTypes: { doc_count: 2, pdf: { buckets: [ { key: 'canvas workpad', doc_count: 1 }, { key: 'dashboard', doc_count: 1 }, ] } },
                statusTypes: { buckets: [{ key: 'completed', doc_count: 4 }] },
                jobTypes: { buckets: [ { key: 'printable_pdf', doc_count: 2 }, { key: 'PNG', doc_count: 1 }, { key: 'csv', doc_count: 1 }, ] },
              },
              last7Days: {
                doc_count: 4,
                layoutTypes: { doc_count: 2, pdf: { buckets: [{ key: 'preserve_layout', doc_count: 2 }] } },
                statusByApp: { buckets: [ { key: 'completed', doc_count: 4, jobTypes: { buckets: [ { key: 'printable_pdf', doc_count: 2, appNames: { buckets: [ { key: 'canvas workpad', doc_count: 1 }, { key: 'dashboard', doc_count: 1 }, ] } }, { key: 'PNG', doc_count: 1, appNames: { buckets: [{ key: 'dashboard', doc_count: 1 }] } }, { key: 'csv', doc_count: 1, appNames: { buckets: [] } }, ] } }, ] },
                objectTypes: { doc_count: 2, pdf: { buckets: [ { key: 'canvas workpad', doc_count: 1 }, { key: 'dashboard', doc_count: 1 }, ] } },
                statusTypes: { buckets: [{ key: 'completed', doc_count: 4 }] },
                jobTypes: { buckets: [ { key: 'printable_pdf', doc_count: 2 }, { key: 'PNG', doc_count: 1 }, { key: 'csv', doc_count: 1 }, ] },
              },
            }, // prettier-ignore
          },
        },
      })
    );
    const usageStats = await collector.fetch(collectorFetchContext);
    expect(usageStats).toMatchSnapshot();
  });

  test('with empty data', async () => {
    const plugins = getPluginsMock();
    const collector = getReportingUsageCollector(
      mockCore,
      plugins.usageCollection,
      getLicenseMock(),
      exportTypesRegistry,
      function isReady() {
        return Promise.resolve(true);
      }
    );

    collectorFetchContext = getMockFetchClients(
      getResponseMock({
        aggregations: {
          ranges: {
            buckets: {
            all: {
              doc_count: 0,
              jobTypes: { buckets: [] },
              layoutTypes: { doc_count: 0, pdf: { buckets: [] } },
              objectTypes: { doc_count: 0, pdf: { buckets: [] } },
              statusByApp: { buckets: [] },
              statusTypes: { buckets: [] },
              sizeMax: { value: null},
              sizeMin: { value: null },
              sizeAvg: { value: null},
            },
            last7Days: {
              doc_count: 0,
              jobTypes: { buckets: [] },
              layoutTypes: { doc_count: 0, pdf: { buckets: [] } },
              objectTypes: { doc_count: 0, pdf: { buckets: [] } },
              statusByApp: { buckets: [] },
              statusTypes: { buckets: [] },
              sizeMax: { value: null},
              sizeMin: { value: null },
              sizeAvg: { value: null},

            },
          }, // prettier-ignore
          },
        },
      })
    );
    const usageStats = await collector.fetch(collectorFetchContext);
    expect(usageStats).toMatchSnapshot();
  });
});

describe('Ready for collection observable', () => {
  test('converts observable to promise', async () => {
    const mockReporting = await createMockReportingCore(createMockConfigSchema());

    const usageCollection = getMockUsageCollection();
    const makeCollectorSpy = sinon.spy();
    usageCollection.makeUsageCollector = makeCollectorSpy;

    const plugins = getPluginsMock({ usageCollection, license: 'gold' });
    registerReportingUsageCollector(mockReporting, plugins);

    const [args] = makeCollectorSpy.firstCall.args;
    expect(args).toMatchSnapshot();

    await expect(args.isReady()).resolves.toBe(true);
  });
});
