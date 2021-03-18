/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as Rx from 'rxjs';
import { identity, range } from 'lodash';
import { IScopedClusterClient, IUiSettingsClient, SearchResponse } from 'src/core/server';
import {
  elasticsearchServiceMock,
  savedObjectsClientMock,
  uiSettingsServiceMock,
} from 'src/core/server/mocks';
import { FieldFormatsRegistry, ISearchStartSearchSource } from 'src/plugins/data/common';
import { searchSourceInstanceMock } from 'src/plugins/data/common/search/search_source/mocks';
import { IScopedSearchClient } from 'src/plugins/data/server';
import { dataPluginMock } from 'src/plugins/data/server/mocks';
import { ReportingConfig } from '../../../';
import { CancellationToken } from '../../../../common';
import {
  UI_SETTINGS_CSV_QUOTE_VALUES,
  UI_SETTINGS_CSV_SEPARATOR,
  UI_SETTINGS_DATEFORMAT_TZ,
} from '../../../../common/constants';
import {
  createMockConfig,
  createMockConfigSchema,
  createMockLevelLogger,
} from '../../../test_helpers';
import { JobParamsCSV } from '../types';
import { CsvGenerator } from './generate_csv';

const createMockJob = (baseObj: any = {}): JobParamsCSV => ({
  ...baseObj,
});

let mockEsClient: IScopedClusterClient;
let mockDataClient: IScopedSearchClient;
let mockConfig: ReportingConfig;
let uiSettingsClient: IUiSettingsClient;

const searchSourceMock = { ...searchSourceInstanceMock };
const mockSearchSourceService: jest.Mocked<ISearchStartSearchSource> = {
  create: jest.fn().mockReturnValue(searchSourceMock),
  createEmpty: jest.fn().mockReturnValue(searchSourceMock),
};
const mockDataClientSearchDefault = jest.fn().mockImplementation(
  (): Rx.Observable<{ rawResponse: SearchResponse<unknown> }> =>
    Rx.of({
      rawResponse: {
        took: 1,
        timed_out: false,
        _shards: { total: 1, successful: 1, failed: 0, skipped: 0 },
        hits: {
          hits: [],
          total: 0,
          max_score: 0,
        },
      },
    })
);
const mockSearchSourceGetFieldDefault = jest.fn().mockImplementation((key: string) => {
  switch (key) {
    case 'fields':
      return ['date', 'ip', 'message'];
    case 'index':
      return {
        fields: {
          getByName: jest.fn().mockImplementation(() => []),
          getByType: jest.fn().mockImplementation(() => []),
        },
        getFormatterForField: jest.fn(),
      };
  }
});

const mockFieldFormatsRegistry = ({
  deserialize: jest
    .fn()
    .mockImplementation(() => ({ id: 'string', convert: jest.fn().mockImplementation(identity) })),
} as unknown) as FieldFormatsRegistry;

beforeEach(async () => {
  mockEsClient = elasticsearchServiceMock.createScopedClusterClient();
  mockDataClient = dataPluginMock.createStartContract().search.asScoped({} as any);
  mockDataClient.search = mockDataClientSearchDefault;

  uiSettingsClient = uiSettingsServiceMock
    .createStartContract()
    .asScopedToClient(savedObjectsClientMock.create());
  uiSettingsClient.get = jest.fn().mockImplementation((key): any => {
    switch (key) {
      case UI_SETTINGS_CSV_QUOTE_VALUES:
        return true;
      case UI_SETTINGS_CSV_SEPARATOR:
        return ',';
      case UI_SETTINGS_DATEFORMAT_TZ:
        return 'Browser';
    }
  });

  mockConfig = createMockConfig(
    createMockConfigSchema({
      csv: {
        checkForFormulas: true,
        escapeFormulaValues: true,
        maxSizeBytes: 180000,
        scroll: { size: 500, duration: '30s' },
      },
    })
  );

  searchSourceMock.getField = mockSearchSourceGetFieldDefault;
});

const logger = createMockLevelLogger();

it('formats an empty search result to CSV content', async () => {
  const generateCsv = new CsvGenerator(
    createMockJob({}),
    mockConfig,
    {
      es: mockEsClient,
      data: mockDataClient,
      uiSettings: uiSettingsClient,
    },
    {
      searchSourceStart: mockSearchSourceService,
      fieldFormatsRegistry: mockFieldFormatsRegistry,
    },
    new CancellationToken(),
    logger
  );
  const csvResult = await generateCsv.generateData();
  expect(csvResult.content).toMatchSnapshot();
  expect(csvResult.csv_contains_formulas).toBe(false);
});

it('formats a search result to CSV content', async () => {
  mockDataClient.search = jest.fn().mockImplementation(() =>
    Rx.of({
      rawResponse: {
        hits: {
          hits: [
            {
              fields: {
                date: `["2020-12-31T00:14:28.000Z"]`,
                ip: `["110.135.176.89"]`,
                message: `["This is a great message!"]`,
              },
            },
          ],
          total: 1,
        },
      },
    })
  );
  const generateCsv = new CsvGenerator(
    createMockJob({}),
    mockConfig,
    {
      es: mockEsClient,
      data: mockDataClient,
      uiSettings: uiSettingsClient,
    },
    {
      searchSourceStart: mockSearchSourceService,
      fieldFormatsRegistry: mockFieldFormatsRegistry,
    },
    new CancellationToken(),
    logger
  );
  const csvResult = await generateCsv.generateData();
  expect(csvResult.content).toMatchSnapshot();
  expect(csvResult.csv_contains_formulas).toBe(false);
});

const HITS_TOTAL = 100;

it('calculates the bytes of the content', async () => {
  searchSourceMock.getField = jest.fn().mockImplementation((key: string) => {
    if (key === 'fields') {
      return ['message'];
    }
    return mockSearchSourceGetFieldDefault(key);
  });
  mockDataClient.search = jest.fn().mockImplementation(() =>
    Rx.of({
      rawResponse: {
        hits: {
          hits: range(0, HITS_TOTAL).map((hit, i) => ({
            fields: {
              message: ['this is a great message'],
            },
          })),
          total: HITS_TOTAL,
        },
      },
    })
  );

  const generateCsv = new CsvGenerator(
    createMockJob({}),
    mockConfig,
    {
      es: mockEsClient,
      data: mockDataClient,
      uiSettings: uiSettingsClient,
    },
    {
      searchSourceStart: mockSearchSourceService,
      fieldFormatsRegistry: mockFieldFormatsRegistry,
    },
    new CancellationToken(),
    logger
  );
  const csvResult = await generateCsv.generateData();
  expect(csvResult.size).toBe(2608);
  expect(csvResult.max_size_reached).toBe(false);
  expect(csvResult.warnings).toEqual([]);
});

it('warns if max size was reached', async () => {
  const TEST_MAX_SIZE = 500;

  mockConfig = createMockConfig(
    createMockConfigSchema({
      csv: {
        checkForFormulas: true,
        escapeFormulaValues: true,
        maxSizeBytes: TEST_MAX_SIZE,
        scroll: { size: 500, duration: '30s' },
      },
    })
  );

  mockDataClient.search = jest.fn().mockImplementation(() =>
    Rx.of({
      rawResponse: {
        hits: {
          hits: range(0, HITS_TOTAL).map((hit, i) => ({
            fields: {
              date: ['2020-12-31T00:14:28.000Z'],
              ip: ['110.135.176.89'],
              message: ['super cali fragile istic XPLA docious'],
            },
          })),
          total: HITS_TOTAL,
        },
      },
    })
  );

  const generateCsv = new CsvGenerator(
    createMockJob({}),
    mockConfig,
    {
      es: mockEsClient,
      data: mockDataClient,
      uiSettings: uiSettingsClient,
    },
    {
      searchSourceStart: mockSearchSourceService,
      fieldFormatsRegistry: mockFieldFormatsRegistry,
    },
    new CancellationToken(),
    logger
  );
  const csvResult = await generateCsv.generateData();
  expect(csvResult.max_size_reached).toBe(true);
  expect(csvResult.warnings).toEqual([]);
  expect(csvResult.content).toMatchSnapshot();
});

it('uses the scrollId to page all the data', async () => {
  mockDataClient.search = jest.fn().mockImplementation(() =>
    Rx.of({
      rawResponse: {
        _scroll_id: 'awesome-scroll-hero',
        hits: {
          hits: range(0, HITS_TOTAL / 10).map((hit, i) => ({
            fields: {
              date: ['2020-12-31T00:14:28.000Z'],
              ip: ['110.135.176.89'],
              message: ['hit from the initial search'],
            },
          })),
          total: HITS_TOTAL,
        },
      },
    })
  );
  mockEsClient.asCurrentUser.scroll = jest.fn().mockResolvedValue({
    body: {
      hits: {
        hits: range(0, HITS_TOTAL / 10).map((hit, i) => ({
          fields: {
            date: ['2020-12-31T00:14:28.000Z'],
            ip: ['110.135.176.89'],
            message: ['hit from a subsequent scroll'],
          },
        })),
      },
    },
  });

  const generateCsv = new CsvGenerator(
    createMockJob({}),
    mockConfig,
    {
      es: mockEsClient,
      data: mockDataClient,
      uiSettings: uiSettingsClient,
    },
    {
      searchSourceStart: mockSearchSourceService,
      fieldFormatsRegistry: mockFieldFormatsRegistry,
    },
    new CancellationToken(),
    logger
  );
  const csvResult = await generateCsv.generateData();
  expect(csvResult.warnings).toEqual([]);
  expect(csvResult.content).toMatchSnapshot();
});

describe('fields', () => {
  it('cells can be multi-value', async () => {
    searchSourceMock.getField = jest.fn().mockImplementation((key: string) => {
      if (key === 'fields') {
        return ['_id', 'sku'];
      }
      return mockSearchSourceGetFieldDefault(key);
    });
    mockDataClient.search = jest.fn().mockImplementation(() =>
      Rx.of({
        rawResponse: {
          hits: {
            hits: [
              {
                _id: 'my-cool-id',
                _index: 'my-cool-index',
                _version: 4,
                fields: {
                  sku: [`This is a cool SKU.`, `This is also a cool SKU.`],
                },
              },
            ],
            total: 1,
          },
        },
      })
    );

    const generateCsv = new CsvGenerator(
      createMockJob({ searchSource: {} }),
      mockConfig,
      {
        es: mockEsClient,
        data: mockDataClient,
        uiSettings: uiSettingsClient,
      },
      {
        searchSourceStart: mockSearchSourceService,
        fieldFormatsRegistry: mockFieldFormatsRegistry,
      },
      new CancellationToken(),
      logger
    );
    const csvResult = await generateCsv.generateData();

    expect(csvResult.content).toMatchSnapshot();
  });

  it('provides top-level underscored fields as columns', async () => {
    searchSourceMock.getField = jest.fn().mockImplementation((key: string) => {
      if (key === 'fields') {
        return ['_id', '_index', 'date', 'message'];
      }
      return mockSearchSourceGetFieldDefault(key);
    });
    mockDataClient.search = jest.fn().mockImplementation(() =>
      Rx.of({
        rawResponse: {
          hits: {
            hits: [
              {
                _id: 'my-cool-id',
                _index: 'my-cool-index',
                _version: 4,
                fields: {
                  date: ['2020-12-31T00:14:28.000Z'],
                  message: [`it's nice to see you`],
                },
              },
            ],
            total: 1,
          },
        },
      })
    );

    const generateCsv = new CsvGenerator(
      createMockJob({
        searchSource: {
          query: { query: '', language: 'kuery' },
          sort: [{ '@date': 'desc' }],
          index: '93f4bc50-6662-11eb-98bc-f550e2308366',
          fields: ['_id', '_index', '@date', 'message'],
          filter: [],
        },
      }),
      mockConfig,
      {
        es: mockEsClient,
        data: mockDataClient,
        uiSettings: uiSettingsClient,
      },
      {
        searchSourceStart: mockSearchSourceService,
        fieldFormatsRegistry: mockFieldFormatsRegistry,
      },
      new CancellationToken(),
      logger
    );

    const csvResult = await generateCsv.generateData();

    expect(csvResult.content).toMatchSnapshot();
    expect(csvResult.csv_contains_formulas).toBe(false);
  });

  it('sorts the fields when they are to be used as table column names', async () => {
    searchSourceMock.getField = jest.fn().mockImplementation((key: string) => {
      if (key === 'fields') {
        return ['*'];
      }
      return mockSearchSourceGetFieldDefault(key);
    });
    mockDataClient.search = jest.fn().mockImplementation(() =>
      Rx.of({
        rawResponse: {
          hits: {
            hits: [
              {
                _id: 'my-cool-id',
                _index: 'my-cool-index',
                _version: 4,
                fields: {
                  date: ['2020-12-31T00:14:28.000Z'],
                  message_z: [`test field Z`],
                  message_y: [`test field Y`],
                  message_x: [`test field X`],
                  message_w: [`test field W`],
                  message_v: [`test field V`],
                  message_u: [`test field U`],
                  message_t: [`test field T`],
                },
              },
            ],
            total: 1,
          },
        },
      })
    );

    const generateCsv = new CsvGenerator(
      createMockJob({
        searchSource: {
          query: { query: '', language: 'kuery' },
          sort: [{ '@date': 'desc' }],
          index: '93f4bc50-6662-11eb-98bc-f550e2308366',
          fields: ['*'],
          filter: [],
        },
      }),
      mockConfig,
      {
        es: mockEsClient,
        data: mockDataClient,
        uiSettings: uiSettingsClient,
      },
      {
        searchSourceStart: mockSearchSourceService,
        fieldFormatsRegistry: mockFieldFormatsRegistry,
      },
      new CancellationToken(),
      logger
    );

    const csvResult = await generateCsv.generateData();

    expect(csvResult.content).toMatchSnapshot();
    expect(csvResult.csv_contains_formulas).toBe(false);
  });
});

describe('formulas', () => {
  const TEST_FORMULA = '=SUM(A1:A2)';

  it(`escapes formula values in a cell, doesn't warn the csv contains formulas`, async () => {
    mockDataClient.search = jest.fn().mockImplementation(() =>
      Rx.of({
        rawResponse: {
          hits: {
            hits: [
              {
                fields: {
                  date: ['2020-12-31T00:14:28.000Z'],
                  ip: ['110.135.176.89'],
                  message: [TEST_FORMULA],
                },
              },
            ],
            total: 1,
          },
        },
      })
    );

    const generateCsv = new CsvGenerator(
      createMockJob({}),
      mockConfig,
      {
        es: mockEsClient,
        data: mockDataClient,
        uiSettings: uiSettingsClient,
      },
      {
        searchSourceStart: mockSearchSourceService,
        fieldFormatsRegistry: mockFieldFormatsRegistry,
      },
      new CancellationToken(),
      logger
    );

    const csvResult = await generateCsv.generateData();

    expect(csvResult.content).toMatchSnapshot();
    expect(csvResult.csv_contains_formulas).toBe(false);
  });

  it(`escapes formula values in a header, doesn't warn the csv contains formulas`, async () => {
    mockDataClient.search = jest.fn().mockImplementation(() =>
      Rx.of({
        rawResponse: {
          hits: {
            hits: [
              {
                fields: {
                  date: ['2020-12-31T00:14:28.000Z'],
                  ip: ['110.135.176.89'],
                  [TEST_FORMULA]: 'This is great data',
                },
              },
            ],
            total: 1,
          },
        },
      })
    );

    searchSourceMock.getField = jest.fn().mockImplementation((key: string) => {
      if (key === 'fields') {
        return ['date', 'ip', TEST_FORMULA];
      }
      return mockSearchSourceGetFieldDefault(key);
    });

    const generateCsv = new CsvGenerator(
      createMockJob({}),
      mockConfig,
      {
        es: mockEsClient,
        data: mockDataClient,
        uiSettings: uiSettingsClient,
      },
      {
        searchSourceStart: mockSearchSourceService,
        fieldFormatsRegistry: mockFieldFormatsRegistry,
      },
      new CancellationToken(),
      logger
    );

    const csvResult = await generateCsv.generateData();

    expect(csvResult.content).toMatchSnapshot();
    expect(csvResult.csv_contains_formulas).toBe(false);
  });

  it('can check for formulas, without escaping them', async () => {
    mockConfig = createMockConfig(
      createMockConfigSchema({
        csv: {
          checkForFormulas: true,
          escapeFormulaValues: false,
          maxSizeBytes: 180000,
          scroll: { size: 500, duration: '30s' },
        },
      })
    );
    mockDataClient.search = jest.fn().mockImplementation(() =>
      Rx.of({
        rawResponse: {
          hits: {
            hits: [
              {
                fields: {
                  date: ['2020-12-31T00:14:28.000Z'],
                  ip: ['110.135.176.89'],
                  message: [TEST_FORMULA],
                },
              },
            ],
            total: 1,
          },
        },
      })
    );

    const generateCsv = new CsvGenerator(
      createMockJob({}),
      mockConfig,
      {
        es: mockEsClient,
        data: mockDataClient,
        uiSettings: uiSettingsClient,
      },
      {
        searchSourceStart: mockSearchSourceService,
        fieldFormatsRegistry: mockFieldFormatsRegistry,
      },
      new CancellationToken(),
      logger
    );

    const csvResult = await generateCsv.generateData();

    expect(csvResult.content).toMatchSnapshot();
    expect(csvResult.csv_contains_formulas).toBe(true);
  });
});
