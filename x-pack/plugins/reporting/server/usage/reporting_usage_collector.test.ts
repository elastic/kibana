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
import { ReportingConfig, ReportingCore } from '../';
import { getExportTypesRegistry } from '../lib/export_types_registry';
import { createMockConfig, createMockConfigSchema, createMockReportingCore } from '../test_helpers';
import { ReportingSetupDeps } from '../types';
import { FeaturesAvailability } from './';
import {
  getReportingUsageCollector,
  registerReportingUsageCollector,
} from './reporting_usage_collector';
import { ReportingUsageType, SearchResponse } from './types';

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

const getLicenseMock = (licenseType = 'platinum') => () => {
  return Promise.resolve({
    isAvailable: () => true,
    license: { getType: () => licenseType },
  } as FeaturesAvailability);
};

function getPluginsMock(
  { license, usageCollection = getMockUsageCollection() } = { license: 'platinum' }
) {
  return ({
    licensing: { license$: Rx.of(getLicenseMock(license)) },
    usageCollection,
    elasticsearch: {},
    security: {},
  } as unknown) as ReportingSetupDeps & { usageCollection: UsageCollectionSetup };
}

const getResponseMock = (base = {}) => base;

const getMockFetchClients = (resp: any) => {
  const fetchParamsMock = createCollectorFetchContextMock();
  fetchParamsMock.esClient.search = jest.fn().mockResolvedValue({ body: resp });
  return fetchParamsMock;
};
describe('license checks', () => {
  let mockConfig: ReportingConfig;
  let mockCore: ReportingCore;
  beforeAll(async () => {
    mockConfig = createMockConfig(createMockConfigSchema());
    mockCore = await createMockReportingCore(mockConfig);
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

  describe('with platinum license', () => {
    let usageStats: any;
    beforeAll(async () => {
      const plugins = getPluginsMock({ license: 'platinum' });
      const collector = getReportingUsageCollector(
        mockCore,
        plugins.usageCollection,
        getLicenseMock('platinum'),
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
  let mockConfig: ReportingConfig;
  let mockCore: ReportingCore;
  let collectorFetchContext: CollectorFetchContext;
  beforeAll(async () => {
    mockConfig = createMockConfig(createMockConfigSchema());
    mockCore = await createMockReportingCore(mockConfig);
  });
  test('with normal looking usage data', async () => {
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
      getResponseMock(
      {
        aggregations: {
          ranges: {
            buckets: {
              all: {
                doc_count: 12,
                jobTypes: { buckets: [ { doc_count: 9, key: 'printable_pdf' }, { doc_count: 3, key: 'PNG' }, ], },
                layoutTypes: { doc_count: 9, pdf: { buckets: [{ doc_count: 9, key: 'preserve_layout' }] }, },
                objectTypes: { doc_count: 9, pdf: { buckets: [ { doc_count: 6, key: 'canvas workpad' }, { doc_count: 3, key: 'visualization' }, ], }, },
                statusByApp: { buckets: [ { doc_count: 10, jobTypes: { buckets: [ { appNames: { buckets: [ { doc_count: 6, key: 'canvas workpad' }, { doc_count: 3, key: 'visualization' }, ], }, doc_count: 9, key: 'printable_pdf', }, { appNames: { buckets: [{ doc_count: 1, key: 'visualization' }] }, doc_count: 1, key: 'PNG', }, ], }, key: 'completed', }, { doc_count: 1, jobTypes: { buckets: [ { appNames: { buckets: [{ doc_count: 1, key: 'dashboard' }] }, doc_count: 1, key: 'PNG', }, ], }, key: 'completed_with_warnings', }, { doc_count: 1, jobTypes: { buckets: [ { appNames: { buckets: [{ doc_count: 1, key: 'dashboard' }] }, doc_count: 1, key: 'PNG', }, ], }, key: 'failed', }, ], },
                statusTypes: { buckets: [ { doc_count: 10, key: 'completed' }, { doc_count: 1, key: 'completed_with_warnings' }, { doc_count: 1, key: 'failed' }, ], },
              },
              last7Days: {
                doc_count: 1,
                jobTypes: { buckets: [{ doc_count: 1, key: 'PNG' }] },
                layoutTypes: { doc_count: 0, pdf: { buckets: [] } },
                objectTypes: { doc_count: 0, pdf: { buckets: [] } },
                statusByApp: { buckets: [ { doc_count: 1, jobTypes: { buckets: [ { appNames: { buckets: [{ doc_count: 1, key: 'dashboard' }] }, doc_count: 1, key: 'PNG', }, ], }, key: 'completed_with_warnings', }, ], },
                statusTypes: { buckets: [{ doc_count: 1, key: 'completed_with_warnings' }] },
              },
              lastDay: {
                doc_count: 1,
                jobTypes: { buckets: [{ doc_count: 1, key: 'PNG' }] },
                layoutTypes: { doc_count: 0, pdf: { buckets: [] } },
                objectTypes: { doc_count: 0, pdf: { buckets: [] } },
                statusByApp: { buckets: [ { doc_count: 1, jobTypes: { buckets: [ { appNames: { buckets: [{ doc_count: 1, key: 'dashboard' }] }, doc_count: 1, key: 'PNG', }, ], }, key: 'completed_with_warnings', }, ], },
                statusTypes: { buckets: [{ doc_count: 1, key: 'completed_with_warnings' }] },
              },
            },
          },
        },
      } as SearchResponse) // prettier-ignore
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
      getResponseMock(
      {
        aggregations: {
          ranges: {
            buckets: {
              all: {
                doc_count: 4,
                layoutTypes: { doc_count: 2, pdf: { buckets: [{ key: 'preserve_layout', doc_count: 2 }] }, },
                statusByApp: { buckets: [ { key: 'completed', doc_count: 4, jobTypes: { buckets: [ { key: 'printable_pdf', doc_count: 2, appNames: { buckets: [ { key: 'canvas workpad', doc_count: 1 }, { key: 'dashboard', doc_count: 1 }, ], }, }, { key: 'PNG', doc_count: 1, appNames: { buckets: [{ key: 'dashboard', doc_count: 1 }] }, }, { key: 'csv', doc_count: 1, appNames: { buckets: [] } }, ], }, }, ], },
                objectTypes: { doc_count: 2, pdf: { buckets: [ { key: 'canvas workpad', doc_count: 1 }, { key: 'dashboard', doc_count: 1 }, ], }, },
                statusTypes: { buckets: [{ key: 'completed', doc_count: 4 }] },
                jobTypes: { buckets: [ { key: 'printable_pdf', doc_count: 2 }, { key: 'PNG', doc_count: 1 }, { key: 'csv', doc_count: 1 }, ], },
              },
              last7Days: {
                doc_count: 4,
                layoutTypes: { doc_count: 2, pdf: { buckets: [{ key: 'preserve_layout', doc_count: 2 }] }, },
                statusByApp: { buckets: [ { key: 'completed', doc_count: 4, jobTypes: { buckets: [ { key: 'printable_pdf', doc_count: 2, appNames: { buckets: [ { key: 'canvas workpad', doc_count: 1 }, { key: 'dashboard', doc_count: 1 }, ], }, }, { key: 'PNG', doc_count: 1, appNames: { buckets: [{ key: 'dashboard', doc_count: 1 }] }, }, { key: 'csv', doc_count: 1, appNames: { buckets: [] } }, ], }, }, ], },
                objectTypes: { doc_count: 2, pdf: { buckets: [ { key: 'canvas workpad', doc_count: 1 }, { key: 'dashboard', doc_count: 1 }, ], }, },
                statusTypes: { buckets: [{ key: 'completed', doc_count: 4 }] },
                jobTypes: { buckets: [ { key: 'printable_pdf', doc_count: 2 }, { key: 'PNG', doc_count: 1 }, { key: 'csv', doc_count: 1 }, ], },
              },
              lastDay: {
                doc_count: 4,
                layoutTypes: { doc_count: 2, pdf: { buckets: [{ key: 'preserve_layout', doc_count: 2 }] }, },
                statusByApp: { buckets: [ { key: 'completed', doc_count: 4, jobTypes: { buckets: [ { key: 'printable_pdf', doc_count: 2, appNames: { buckets: [ { key: 'canvas workpad', doc_count: 1 }, { key: 'dashboard', doc_count: 1 }, ], }, }, { key: 'PNG', doc_count: 1, appNames: { buckets: [{ key: 'dashboard', doc_count: 1 }] }, }, { key: 'csv', doc_count: 1, appNames: { buckets: [] } }, ], }, }, ], },
                objectTypes: { doc_count: 2, pdf: { buckets: [ { key: 'canvas workpad', doc_count: 1 }, { key: 'dashboard', doc_count: 1 }, ], }, },
                statusTypes: { buckets: [{ key: 'completed', doc_count: 4 }] },
                jobTypes: { buckets: [ { key: 'printable_pdf', doc_count: 2 }, { key: 'PNG', doc_count: 1 }, { key: 'csv', doc_count: 1 }, ], },
              },
            },
          },
        },
      } as SearchResponse) // prettier-ignore
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
            },
            last7Days: {
              doc_count: 0,
              jobTypes: { buckets: [] },
              layoutTypes: { doc_count: 0, pdf: { buckets: [] } },
              objectTypes: { doc_count: 0, pdf: { buckets: [] } },
              statusByApp: { buckets: [] },
              statusTypes: { buckets: [] },
            },
            lastDay: {
              doc_count: 0,
              jobTypes: { buckets: [] },
              layoutTypes: { doc_count: 0, pdf: { buckets: [] } },
              objectTypes: { doc_count: 0, pdf: { buckets: [] } },
              statusByApp: { buckets: [] },
              statusTypes: { buckets: [] },
            },
          },
        },
      },
    } as SearchResponse) // prettier-ignore
    );
    const usageStats = await collector.fetch(collectorFetchContext);
    expect(usageStats).toMatchSnapshot();
  });

  test('Cast various example data to the TypeScript definition', () => {
    const check = (obj: ReportingUsageType) => {
      return typeof obj;
    };

    // just check that the example objects can be cast to ReportingUsageType
    check({
      PNG: { available: true, total: 7 },
      _all: 21,
      available: true,
      browser_type: 'chromium',
      csv: { available: true, total: 4 },
      csv_searchsource: { available: true, total: 4 },
      enabled: true,
      last7Days: {
        PNG: { available: true, total: 0 },
        _all: 0,
        csv: { available: true, total: 0 },
        csv_searchsource: { available: true, total: 0 },
        printable_pdf: {
          app: { dashboard: 0, visualization: 0 },
          available: true,
          layout: { preserve_layout: 0, print: 0 },
          total: 0,
        },
        status: { completed: 0, failed: 0 },
        statuses: {},
      },
      printable_pdf: {
        app: { 'canvas workpad': 3, dashboard: 3, visualization: 4 },
        available: true,
        layout: { preserve_layout: 7, print: 3 },
        total: 10,
      },
      status: { completed: 21, failed: 0 },
      statuses: {
        completed: {
          PNG: { dashboard: 3, visualization: 4 },
          csv: {},
          printable_pdf: { 'canvas workpad': 3, dashboard: 3, visualization: 4 },
        },
      },
    });
    check({
      PNG: { available: true, total: 3 },
      _all: 4,
      available: true,
      browser_type: 'chromium',
      csv: { available: true, total: 0 },
      csv_searchsource: { available: true, total: 0 },
      enabled: true,
      last7Days: {
        PNG: { available: true, total: 3 },
        _all: 4,
        csv: { available: true, total: 0 },
        csv_searchsource: { available: true, total: 0 },
        printable_pdf: {
          app: { 'canvas workpad': 1, dashboard: 0, visualization: 0 },
          available: true,
          layout: { preserve_layout: 1, print: 0 },
          total: 1,
        },
        status: { completed: 4, failed: 0 },
        statuses: {
          completed: { PNG: { visualization: 3 }, printable_pdf: { 'canvas workpad': 1 } },
        },
      },
      printable_pdf: {
        app: { 'canvas workpad': 1, dashboard: 0, visualization: 0 },
        available: true,
        layout: { preserve_layout: 1, print: 0 },
        total: 1,
      },
      status: { completed: 4, failed: 0 },
      statuses: {
        completed: { PNG: { visualization: 3 }, printable_pdf: { 'canvas workpad': 1 } },
      },
    });
    check({
      available: true,
      browser_type: 'chromium',
      enabled: true,
      last7Days: {
        _all: 0,
        status: { completed: 0, failed: 0 },
        statuses: {},
        printable_pdf: {
          available: true,
          total: 0,
          app: { dashboard: 0, visualization: 0 },
          layout: { preserve_layout: 0, print: 0 },
        },
        csv: { available: true, total: 0 },
        csv_searchsource: { available: true, total: 0 },
        PNG: { available: true, total: 0 },
      },
      _all: 0,
      status: { completed: 0, failed: 0 },
      statuses: {},
      printable_pdf: {
        available: true,
        total: 0,
        app: { dashboard: 0, visualization: 0 },
        layout: { preserve_layout: 0, print: 0 },
      },
      csv: { available: true, total: 0 },
      csv_searchsource: { available: true, total: 0 },
      PNG: { available: true, total: 0 },
    });
  });
});

describe('Ready for collection observable', () => {
  test('converts observable to promise', async () => {
    const mockConfig = createMockConfig(createMockConfigSchema());
    const mockReporting = await createMockReportingCore(mockConfig);

    const usageCollection = getMockUsageCollection();
    const makeCollectorSpy = sinon.spy();
    usageCollection.makeUsageCollector = makeCollectorSpy;

    const plugins = getPluginsMock({ usageCollection, license: 'platinum' });
    registerReportingUsageCollector(mockReporting, plugins);

    const [args] = makeCollectorSpy.firstCall.args;
    expect(args).toMatchInlineSnapshot(`
      Object {
        "fetch": [Function],
        "isReady": [Function],
        "schema": Object {
          "PNG": Object {
            "available": Object {
              "type": "boolean",
            },
            "total": Object {
              "type": "long",
            },
          },
          "_all": Object {
            "type": "long",
          },
          "available": Object {
            "type": "boolean",
          },
          "browser_type": Object {
            "type": "keyword",
          },
          "csv": Object {
            "available": Object {
              "type": "boolean",
            },
            "total": Object {
              "type": "long",
            },
          },
          "csv_searchsource": Object {
            "available": Object {
              "type": "boolean",
            },
            "total": Object {
              "type": "long",
            },
          },
          "enabled": Object {
            "type": "boolean",
          },
          "last7Days": Object {
            "PNG": Object {
              "available": Object {
                "type": "boolean",
              },
              "total": Object {
                "type": "long",
              },
            },
            "_all": Object {
              "type": "long",
            },
            "csv": Object {
              "available": Object {
                "type": "boolean",
              },
              "total": Object {
                "type": "long",
              },
            },
            "csv_searchsource": Object {
              "available": Object {
                "type": "boolean",
              },
              "total": Object {
                "type": "long",
              },
            },
            "printable_pdf": Object {
              "app": Object {
                "canvas workpad": Object {
                  "type": "long",
                },
                "dashboard": Object {
                  "type": "long",
                },
                "visualization": Object {
                  "type": "long",
                },
              },
              "available": Object {
                "type": "boolean",
              },
              "layout": Object {
                "preserve_layout": Object {
                  "type": "long",
                },
                "print": Object {
                  "type": "long",
                },
              },
              "total": Object {
                "type": "long",
              },
            },
            "status": Object {
              "cancelled": Object {
                "type": "long",
              },
              "completed": Object {
                "type": "long",
              },
              "completed_with_warnings": Object {
                "type": "long",
              },
              "failed": Object {
                "type": "long",
              },
              "pending": Object {
                "type": "long",
              },
              "processing": Object {
                "type": "long",
              },
            },
            "statuses": Object {
              "cancelled": Object {
                "PNG": Object {
                  "canvas workpad": Object {
                    "type": "long",
                  },
                  "dashboard": Object {
                    "type": "long",
                  },
                  "visualization": Object {
                    "type": "long",
                  },
                },
                "csv": Object {
                  "canvas workpad": Object {
                    "type": "long",
                  },
                  "dashboard": Object {
                    "type": "long",
                  },
                  "visualization": Object {
                    "type": "long",
                  },
                },
                "csv_searchsource": Object {
                  "canvas workpad": Object {
                    "type": "long",
                  },
                  "dashboard": Object {
                    "type": "long",
                  },
                  "visualization": Object {
                    "type": "long",
                  },
                },
                "printable_pdf": Object {
                  "canvas workpad": Object {
                    "type": "long",
                  },
                  "dashboard": Object {
                    "type": "long",
                  },
                  "visualization": Object {
                    "type": "long",
                  },
                },
              },
              "completed": Object {
                "PNG": Object {
                  "canvas workpad": Object {
                    "type": "long",
                  },
                  "dashboard": Object {
                    "type": "long",
                  },
                  "visualization": Object {
                    "type": "long",
                  },
                },
                "csv": Object {
                  "canvas workpad": Object {
                    "type": "long",
                  },
                  "dashboard": Object {
                    "type": "long",
                  },
                  "visualization": Object {
                    "type": "long",
                  },
                },
                "csv_searchsource": Object {
                  "canvas workpad": Object {
                    "type": "long",
                  },
                  "dashboard": Object {
                    "type": "long",
                  },
                  "visualization": Object {
                    "type": "long",
                  },
                },
                "printable_pdf": Object {
                  "canvas workpad": Object {
                    "type": "long",
                  },
                  "dashboard": Object {
                    "type": "long",
                  },
                  "visualization": Object {
                    "type": "long",
                  },
                },
              },
              "completed_with_warnings": Object {
                "PNG": Object {
                  "canvas workpad": Object {
                    "type": "long",
                  },
                  "dashboard": Object {
                    "type": "long",
                  },
                  "visualization": Object {
                    "type": "long",
                  },
                },
                "csv": Object {
                  "canvas workpad": Object {
                    "type": "long",
                  },
                  "dashboard": Object {
                    "type": "long",
                  },
                  "visualization": Object {
                    "type": "long",
                  },
                },
                "csv_searchsource": Object {
                  "canvas workpad": Object {
                    "type": "long",
                  },
                  "dashboard": Object {
                    "type": "long",
                  },
                  "visualization": Object {
                    "type": "long",
                  },
                },
                "printable_pdf": Object {
                  "canvas workpad": Object {
                    "type": "long",
                  },
                  "dashboard": Object {
                    "type": "long",
                  },
                  "visualization": Object {
                    "type": "long",
                  },
                },
              },
              "failed": Object {
                "PNG": Object {
                  "canvas workpad": Object {
                    "type": "long",
                  },
                  "dashboard": Object {
                    "type": "long",
                  },
                  "visualization": Object {
                    "type": "long",
                  },
                },
                "csv": Object {
                  "canvas workpad": Object {
                    "type": "long",
                  },
                  "dashboard": Object {
                    "type": "long",
                  },
                  "visualization": Object {
                    "type": "long",
                  },
                },
                "csv_searchsource": Object {
                  "canvas workpad": Object {
                    "type": "long",
                  },
                  "dashboard": Object {
                    "type": "long",
                  },
                  "visualization": Object {
                    "type": "long",
                  },
                },
                "printable_pdf": Object {
                  "canvas workpad": Object {
                    "type": "long",
                  },
                  "dashboard": Object {
                    "type": "long",
                  },
                  "visualization": Object {
                    "type": "long",
                  },
                },
              },
              "pending": Object {
                "PNG": Object {
                  "canvas workpad": Object {
                    "type": "long",
                  },
                  "dashboard": Object {
                    "type": "long",
                  },
                  "visualization": Object {
                    "type": "long",
                  },
                },
                "csv": Object {
                  "canvas workpad": Object {
                    "type": "long",
                  },
                  "dashboard": Object {
                    "type": "long",
                  },
                  "visualization": Object {
                    "type": "long",
                  },
                },
                "csv_searchsource": Object {
                  "canvas workpad": Object {
                    "type": "long",
                  },
                  "dashboard": Object {
                    "type": "long",
                  },
                  "visualization": Object {
                    "type": "long",
                  },
                },
                "printable_pdf": Object {
                  "canvas workpad": Object {
                    "type": "long",
                  },
                  "dashboard": Object {
                    "type": "long",
                  },
                  "visualization": Object {
                    "type": "long",
                  },
                },
              },
              "processing": Object {
                "PNG": Object {
                  "canvas workpad": Object {
                    "type": "long",
                  },
                  "dashboard": Object {
                    "type": "long",
                  },
                  "visualization": Object {
                    "type": "long",
                  },
                },
                "csv": Object {
                  "canvas workpad": Object {
                    "type": "long",
                  },
                  "dashboard": Object {
                    "type": "long",
                  },
                  "visualization": Object {
                    "type": "long",
                  },
                },
                "csv_searchsource": Object {
                  "canvas workpad": Object {
                    "type": "long",
                  },
                  "dashboard": Object {
                    "type": "long",
                  },
                  "visualization": Object {
                    "type": "long",
                  },
                },
                "printable_pdf": Object {
                  "canvas workpad": Object {
                    "type": "long",
                  },
                  "dashboard": Object {
                    "type": "long",
                  },
                  "visualization": Object {
                    "type": "long",
                  },
                },
              },
            },
          },
          "printable_pdf": Object {
            "app": Object {
              "canvas workpad": Object {
                "type": "long",
              },
              "dashboard": Object {
                "type": "long",
              },
              "visualization": Object {
                "type": "long",
              },
            },
            "available": Object {
              "type": "boolean",
            },
            "layout": Object {
              "preserve_layout": Object {
                "type": "long",
              },
              "print": Object {
                "type": "long",
              },
            },
            "total": Object {
              "type": "long",
            },
          },
          "status": Object {
            "cancelled": Object {
              "type": "long",
            },
            "completed": Object {
              "type": "long",
            },
            "completed_with_warnings": Object {
              "type": "long",
            },
            "failed": Object {
              "type": "long",
            },
            "pending": Object {
              "type": "long",
            },
            "processing": Object {
              "type": "long",
            },
          },
          "statuses": Object {
            "cancelled": Object {
              "PNG": Object {
                "canvas workpad": Object {
                  "type": "long",
                },
                "dashboard": Object {
                  "type": "long",
                },
                "visualization": Object {
                  "type": "long",
                },
              },
              "csv": Object {
                "canvas workpad": Object {
                  "type": "long",
                },
                "dashboard": Object {
                  "type": "long",
                },
                "visualization": Object {
                  "type": "long",
                },
              },
              "csv_searchsource": Object {
                "canvas workpad": Object {
                  "type": "long",
                },
                "dashboard": Object {
                  "type": "long",
                },
                "visualization": Object {
                  "type": "long",
                },
              },
              "printable_pdf": Object {
                "canvas workpad": Object {
                  "type": "long",
                },
                "dashboard": Object {
                  "type": "long",
                },
                "visualization": Object {
                  "type": "long",
                },
              },
            },
            "completed": Object {
              "PNG": Object {
                "canvas workpad": Object {
                  "type": "long",
                },
                "dashboard": Object {
                  "type": "long",
                },
                "visualization": Object {
                  "type": "long",
                },
              },
              "csv": Object {
                "canvas workpad": Object {
                  "type": "long",
                },
                "dashboard": Object {
                  "type": "long",
                },
                "visualization": Object {
                  "type": "long",
                },
              },
              "csv_searchsource": Object {
                "canvas workpad": Object {
                  "type": "long",
                },
                "dashboard": Object {
                  "type": "long",
                },
                "visualization": Object {
                  "type": "long",
                },
              },
              "printable_pdf": Object {
                "canvas workpad": Object {
                  "type": "long",
                },
                "dashboard": Object {
                  "type": "long",
                },
                "visualization": Object {
                  "type": "long",
                },
              },
            },
            "completed_with_warnings": Object {
              "PNG": Object {
                "canvas workpad": Object {
                  "type": "long",
                },
                "dashboard": Object {
                  "type": "long",
                },
                "visualization": Object {
                  "type": "long",
                },
              },
              "csv": Object {
                "canvas workpad": Object {
                  "type": "long",
                },
                "dashboard": Object {
                  "type": "long",
                },
                "visualization": Object {
                  "type": "long",
                },
              },
              "csv_searchsource": Object {
                "canvas workpad": Object {
                  "type": "long",
                },
                "dashboard": Object {
                  "type": "long",
                },
                "visualization": Object {
                  "type": "long",
                },
              },
              "printable_pdf": Object {
                "canvas workpad": Object {
                  "type": "long",
                },
                "dashboard": Object {
                  "type": "long",
                },
                "visualization": Object {
                  "type": "long",
                },
              },
            },
            "failed": Object {
              "PNG": Object {
                "canvas workpad": Object {
                  "type": "long",
                },
                "dashboard": Object {
                  "type": "long",
                },
                "visualization": Object {
                  "type": "long",
                },
              },
              "csv": Object {
                "canvas workpad": Object {
                  "type": "long",
                },
                "dashboard": Object {
                  "type": "long",
                },
                "visualization": Object {
                  "type": "long",
                },
              },
              "csv_searchsource": Object {
                "canvas workpad": Object {
                  "type": "long",
                },
                "dashboard": Object {
                  "type": "long",
                },
                "visualization": Object {
                  "type": "long",
                },
              },
              "printable_pdf": Object {
                "canvas workpad": Object {
                  "type": "long",
                },
                "dashboard": Object {
                  "type": "long",
                },
                "visualization": Object {
                  "type": "long",
                },
              },
            },
            "pending": Object {
              "PNG": Object {
                "canvas workpad": Object {
                  "type": "long",
                },
                "dashboard": Object {
                  "type": "long",
                },
                "visualization": Object {
                  "type": "long",
                },
              },
              "csv": Object {
                "canvas workpad": Object {
                  "type": "long",
                },
                "dashboard": Object {
                  "type": "long",
                },
                "visualization": Object {
                  "type": "long",
                },
              },
              "csv_searchsource": Object {
                "canvas workpad": Object {
                  "type": "long",
                },
                "dashboard": Object {
                  "type": "long",
                },
                "visualization": Object {
                  "type": "long",
                },
              },
              "printable_pdf": Object {
                "canvas workpad": Object {
                  "type": "long",
                },
                "dashboard": Object {
                  "type": "long",
                },
                "visualization": Object {
                  "type": "long",
                },
              },
            },
            "processing": Object {
              "PNG": Object {
                "canvas workpad": Object {
                  "type": "long",
                },
                "dashboard": Object {
                  "type": "long",
                },
                "visualization": Object {
                  "type": "long",
                },
              },
              "csv": Object {
                "canvas workpad": Object {
                  "type": "long",
                },
                "dashboard": Object {
                  "type": "long",
                },
                "visualization": Object {
                  "type": "long",
                },
              },
              "csv_searchsource": Object {
                "canvas workpad": Object {
                  "type": "long",
                },
                "dashboard": Object {
                  "type": "long",
                },
                "visualization": Object {
                  "type": "long",
                },
              },
              "printable_pdf": Object {
                "canvas workpad": Object {
                  "type": "long",
                },
                "dashboard": Object {
                  "type": "long",
                },
                "visualization": Object {
                  "type": "long",
                },
              },
            },
          },
        },
        "type": "reporting",
      }
    `);

    await expect(args.isReady()).resolves.toBe(true);
  });
});
