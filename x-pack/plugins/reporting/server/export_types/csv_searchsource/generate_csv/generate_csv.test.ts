/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors as esErrors } from '@elastic/elasticsearch';
import type { IScopedClusterClient, IUiSettingsClient, SearchResponse } from 'kibana/server';
import { identity, range } from 'lodash';
import * as Rx from 'rxjs';
import {
  elasticsearchServiceMock,
  loggingSystemMock,
  savedObjectsClientMock,
  uiSettingsServiceMock,
} from 'src/core/server/mocks';
import { ISearchStartSearchSource } from 'src/plugins/data/common';
import { searchSourceInstanceMock } from 'src/plugins/data/common/search/search_source/mocks';
import { IScopedSearchClient } from 'src/plugins/data/server';
import { dataPluginMock } from 'src/plugins/data/server/mocks';
import { FieldFormatsRegistry } from 'src/plugins/field_formats/common';
import { Writable } from 'stream';
import { ReportingConfig } from '../../../';
import { CancellationToken } from '../../../../common/cancellation_token';
import {
  UI_SETTINGS_CSV_QUOTE_VALUES,
  UI_SETTINGS_CSV_SEPARATOR,
  UI_SETTINGS_DATEFORMAT_TZ,
} from '../../../../common/constants';
import { UnknownError } from '../../../../common/errors';
import { createMockConfig, createMockConfigSchema } from '../../../test_helpers';
import { JobParamsCSV } from '../types';
import { CsvGenerator } from './generate_csv';

const createMockJob = (baseObj: any = {}): JobParamsCSV => ({
  ...baseObj,
});

let mockEsClient: IScopedClusterClient;
let mockDataClient: IScopedSearchClient;
let mockConfig: ReportingConfig;
let uiSettingsClient: IUiSettingsClient;
let stream: jest.Mocked<Writable>;
let content: string;

const searchSourceMock = { ...searchSourceInstanceMock };
const mockSearchSourceService: jest.Mocked<ISearchStartSearchSource> = {
  create: jest.fn().mockReturnValue(searchSourceMock),
  createEmpty: jest.fn().mockReturnValue(searchSourceMock),
  telemetry: jest.fn(),
  inject: jest.fn(),
  extract: jest.fn(),
  getAllMigrations: jest.fn(),
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

const mockFieldFormatsRegistry = {
  deserialize: jest
    .fn()
    .mockImplementation(() => ({ id: 'string', convert: jest.fn().mockImplementation(identity) })),
} as unknown as FieldFormatsRegistry;

beforeEach(async () => {
  content = '';
  stream = { write: jest.fn((chunk) => (content += chunk)) } as unknown as typeof stream;
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

  searchSourceMock.getField = jest.fn((key: string) => {
    switch (key) {
      case 'index':
        return {
          fields: {
            getByName: jest.fn(() => []),
            getByType: jest.fn(() => []),
          },
          metaFields: ['_id', '_index', '_type', '_score'],
          getFormatterForField: jest.fn(),
        };
    }
  });
});

const logger = loggingSystemMock.createLogger();

it('formats an empty search result to CSV content', async () => {
  const generateCsv = new CsvGenerator(
    createMockJob({ columns: ['date', 'ip', 'message'] }),
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
    logger,
    stream
  );
  const csvResult = await generateCsv.generateData();
  expect(content).toMatchSnapshot();
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
    createMockJob({ columns: ['date', 'ip', 'message'] }),
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
    logger,
    stream
  );
  const csvResult = await generateCsv.generateData();
  expect(content).toMatchSnapshot();
  expect(csvResult.csv_contains_formulas).toBe(false);
});

const HITS_TOTAL = 100;

it('calculates the bytes of the content', async () => {
  mockDataClient.search = jest.fn().mockImplementation(() =>
    Rx.of({
      rawResponse: {
        hits: {
          hits: range(0, HITS_TOTAL).map(() => ({
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
    createMockJob({ columns: ['message'] }),
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
    logger,
    stream
  );
  const csvResult = await generateCsv.generateData();
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
          hits: range(0, HITS_TOTAL).map(() => ({
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
    createMockJob({ columns: ['date', 'ip', 'message'] }),
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
    logger,
    stream
  );
  const csvResult = await generateCsv.generateData();
  expect(csvResult.max_size_reached).toBe(true);
  expect(csvResult.warnings).toEqual([]);
  expect(content).toMatchSnapshot();
});

it('uses the scrollId to page all the data', async () => {
  mockDataClient.search = jest.fn().mockImplementation(() =>
    Rx.of({
      rawResponse: {
        _scroll_id: 'awesome-scroll-hero',
        hits: {
          hits: range(0, HITS_TOTAL / 10).map(() => ({
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
    hits: {
      hits: range(0, HITS_TOTAL / 10).map(() => ({
        fields: {
          date: ['2020-12-31T00:14:28.000Z'],
          ip: ['110.135.176.89'],
          message: ['hit from a subsequent scroll'],
        },
      })),
    },
  });

  const generateCsv = new CsvGenerator(
    createMockJob({ columns: ['date', 'ip', 'message'] }),
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
    logger,
    stream
  );
  const csvResult = await generateCsv.generateData();
  expect(csvResult.warnings).toEqual([]);
  expect(content).toMatchSnapshot();

  expect(mockDataClient.search).toHaveBeenCalledTimes(1);
  expect(mockDataClient.search).toBeCalledWith(
    { params: { ignore_throttled: undefined, scroll: '30s', size: 500 } },
    { strategy: 'es' }
  );

  // `scroll` and `clearScroll` must be called with scroll ID in the post body!
  expect(mockEsClient.asCurrentUser.scroll).toHaveBeenCalledTimes(9);
  expect(mockEsClient.asCurrentUser.scroll).toHaveBeenCalledWith({
    scroll: '30s',
    scroll_id: 'awesome-scroll-hero',
  });

  expect(mockEsClient.asCurrentUser.clearScroll).toHaveBeenCalledTimes(1);
  expect(mockEsClient.asCurrentUser.clearScroll).toHaveBeenCalledWith({
    scroll_id: ['awesome-scroll-hero'],
  });
});

describe('fields from job.searchSource.getFields() (7.12 generated)', () => {
  it('cells can be multi-value', async () => {
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
      createMockJob({ searchSource: {}, columns: ['_id', 'sku'] }),
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
      logger,
      stream
    );
    await generateCsv.generateData();

    expect(content).toMatchSnapshot();
  });

  it('provides top-level underscored fields as columns', async () => {
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
        columns: ['_id', '_index', 'date', 'message'],
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
      logger,
      stream
    );

    const csvResult = await generateCsv.generateData();

    expect(content).toMatchSnapshot();
    expect(csvResult.csv_contains_formulas).toBe(false);
  });

  it('sorts the fields when they are to be used as table column names', async () => {
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
      logger,
      stream
    );

    const csvResult = await generateCsv.generateData();

    expect(content).toMatchSnapshot();
    expect(csvResult.csv_contains_formulas).toBe(false);
  });
});

describe('fields from job.columns (7.13+ generated)', () => {
  it('cells can be multi-value', async () => {
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
                  product: 'coconut',
                  category: [`cool`, `rad`],
                },
              },
            ],
            total: 1,
          },
        },
      })
    );

    const generateCsv = new CsvGenerator(
      createMockJob({ searchSource: {}, columns: ['product', 'category'] }),
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
      logger,
      stream
    );
    await generateCsv.generateData();

    expect(content).toMatchSnapshot();
  });

  it('columns can be top-level fields such as _id and _index', async () => {
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
                  product: 'coconut',
                  category: [`cool`, `rad`],
                },
              },
            ],
            total: 1,
          },
        },
      })
    );

    const generateCsv = new CsvGenerator(
      createMockJob({ searchSource: {}, columns: ['_id', '_index', 'product', 'category'] }),
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
      logger,
      stream
    );
    await generateCsv.generateData();

    expect(content).toMatchSnapshot();
  });

  it('default column names come from tabify', async () => {
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
                  product: 'coconut',
                  category: [`cool`, `rad`],
                },
              },
            ],
            total: 1,
          },
        },
      })
    );

    const generateCsv = new CsvGenerator(
      createMockJob({ searchSource: {}, columns: [] }),
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
      logger,
      stream
    );
    await generateCsv.generateData();

    expect(content).toMatchSnapshot();
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
      createMockJob({ columns: ['date', 'ip', 'message'] }),
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
      logger,
      stream
    );

    const csvResult = await generateCsv.generateData();

    expect(content).toMatchSnapshot();
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

    const generateCsv = new CsvGenerator(
      createMockJob({ columns: ['date', 'ip', TEST_FORMULA] }),
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
      logger,
      stream
    );

    const csvResult = await generateCsv.generateData();

    expect(content).toMatchSnapshot();
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
      createMockJob({ columns: ['date', 'ip', 'message'] }),
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
      logger,
      stream
    );

    const csvResult = await generateCsv.generateData();

    expect(content).toMatchSnapshot();
    expect(csvResult.csv_contains_formulas).toBe(true);
  });
});

it('can override ignoring frozen indices', async () => {
  const originalGet = uiSettingsClient.get;
  uiSettingsClient.get = jest.fn().mockImplementation((key): any => {
    if (key === 'search:includeFrozen') {
      return true;
    }
    return originalGet(key);
  });

  const generateCsv = new CsvGenerator(
    createMockJob({}),
    mockConfig,
    { es: mockEsClient, data: mockDataClient, uiSettings: uiSettingsClient },
    { searchSourceStart: mockSearchSourceService, fieldFormatsRegistry: mockFieldFormatsRegistry },
    new CancellationToken(),
    logger,
    stream
  );

  await generateCsv.generateData();

  expect(mockDataClient.search).toBeCalledWith(
    { params: { ignore_throttled: false, scroll: '30s', size: 500 } },
    { strategy: 'es' }
  );
});

describe('error codes', () => {
  it('returns the expected error code when authentication expires', async () => {
    mockDataClient.search = jest.fn().mockImplementation(() =>
      Rx.of({
        rawResponse: {
          _scroll_id: 'test',
          hits: {
            hits: range(0, 5).map(() => ({
              fields: {
                date: ['2020-12-31T00:14:28.000Z'],
                ip: ['110.135.176.89'],
                message: ['super cali fragile istic XPLA docious'],
              },
            })),
            total: 10,
          },
        },
      })
    );

    mockEsClient.asCurrentUser.scroll = jest.fn().mockImplementation(() => {
      throw new esErrors.ResponseError({ statusCode: 403, meta: {} as any, warnings: [] });
    });

    const generateCsv = new CsvGenerator(
      createMockJob({ columns: ['date', 'ip', 'message'] }),
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
      logger,
      stream
    );

    const { error_code: errorCode, warnings } = await generateCsv.generateData();
    expect(errorCode).toBe('authentication_expired_error');
    expect(warnings).toMatchInlineSnapshot(`
      Array [
        "This report contains partial CSV results because the authentication token expired. Export a smaller amount of data or increase the timeout of the authentication token.",
      ]
    `);
  });

  it('throws for unknown errors', async () => {
    mockDataClient.search = jest.fn().mockImplementation(() => {
      throw new esErrors.ResponseError({ statusCode: 500, meta: {} as any, warnings: [] });
    });
    const generateCsv = new CsvGenerator(
      createMockJob({ columns: ['date', 'ip', 'message'] }),
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
      logger,
      stream
    );
    await expect(generateCsv.generateData()).rejects.toBeInstanceOf(UnknownError);
  });
});
