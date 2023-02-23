/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors as esErrors, estypes } from '@elastic/elasticsearch';
import type { SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import type { IScopedClusterClient, IUiSettingsClient, Logger } from '@kbn/core/server';
import {
  elasticsearchServiceMock,
  loggingSystemMock,
  savedObjectsClientMock,
  uiSettingsServiceMock,
} from '@kbn/core/server/mocks';
import { ISearchStartSearchSource } from '@kbn/data-plugin/common';
import { searchSourceInstanceMock } from '@kbn/data-plugin/common/search/search_source/mocks';
import { IScopedSearchClient } from '@kbn/data-plugin/server';
import { dataPluginMock } from '@kbn/data-plugin/server/mocks';
import { FieldFormatsRegistry } from '@kbn/field-formats-plugin/common';
import { identity, range } from 'lodash';
import * as Rx from 'rxjs';
import type { Writable } from 'stream';
import type { DeepPartial } from 'utility-types';
import { CancellationToken } from '../../../../common/cancellation_token';
import {
  UI_SETTINGS_CSV_QUOTE_VALUES,
  UI_SETTINGS_CSV_SEPARATOR,
  UI_SETTINGS_DATEFORMAT_TZ,
} from '../../../../common/constants';
import { ReportingConfigType } from '../../../config';
import { createMockConfig, createMockConfigSchema } from '../../../test_helpers';
import { JobParamsCSV } from '../types';
import { CsvGenerator } from './generate_csv';

const createMockJob = (baseObj: any = {}): JobParamsCSV => ({
  ...baseObj,
});

let mockEsClient: IScopedClusterClient;
let mockDataClient: IScopedSearchClient;
let mockConfig: ReportingConfigType['csv'];
let mockLogger: jest.Mocked<Logger>;
let uiSettingsClient: IUiSettingsClient;
let stream: jest.Mocked<Writable>;
let content: string;

const searchSourceMock = {
  ...searchSourceInstanceMock,
  getSearchRequestBody: jest.fn(() => ({})),
};

const mockSearchSourceService: jest.Mocked<ISearchStartSearchSource> = {
  create: jest.fn().mockReturnValue(searchSourceMock),
  createEmpty: jest.fn().mockReturnValue(searchSourceMock),
  telemetry: jest.fn(),
  inject: jest.fn(),
  extract: jest.fn(),
  getAllMigrations: jest.fn(),
};

const mockPitId = 'oju9fs3698s3902f02-8qg3-u9w36oiewiuyew6';

const getMockRawResponse = (hits: Array<estypes.SearchHit<unknown>> = [], total = hits.length) => ({
  took: 1,
  timed_out: false,
  pit_id: mockPitId,
  _shards: { total: 1, successful: 1, failed: 0, skipped: 0 },
  hits: { hits, total, max_score: 0 },
});

const mockDataClientSearchDefault = jest.fn().mockImplementation(
  (): Rx.Observable<{ rawResponse: SearchResponse<unknown> }> =>
    Rx.of({
      rawResponse: getMockRawResponse(),
    })
);

const mockFieldFormatsRegistry = {
  deserialize: jest
    .fn()
    .mockImplementation(() => ({ id: 'string', convert: jest.fn().mockImplementation(identity) })),
} as unknown as FieldFormatsRegistry;

const getMockConfig = (properties: DeepPartial<ReportingConfigType> = {}) => {
  const config = createMockConfig(createMockConfigSchema(properties));
  return config.get('csv');
};

beforeEach(async () => {
  content = '';
  stream = { write: jest.fn((chunk) => (content += chunk)) } as unknown as typeof stream;
  mockEsClient = elasticsearchServiceMock.createScopedClusterClient();
  mockDataClient = dataPluginMock.createStartContract().search.asScoped({} as any);
  mockDataClient.search = mockDataClientSearchDefault;

  mockEsClient.asCurrentUser.openPointInTime = jest.fn().mockResolvedValueOnce({ id: mockPitId });

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

  mockConfig = getMockConfig({
    csv: {
      checkForFormulas: true,
      escapeFormulaValues: true,
      maxSizeBytes: 180000,
      scroll: { size: 500, duration: '30s' },
    },
  });

  searchSourceMock.getField = jest.fn((key: string) => {
    switch (key) {
      case 'pit':
        return { id: mockPitId };
      case 'index':
        return {
          fields: {
            getByName: jest.fn(() => []),
            getByType: jest.fn(() => []),
          },
          metaFields: ['_id', '_index', '_type', '_score'],
          getFormatterForField: jest.fn(),
          getIndexPattern: () => 'logstash-*',
        };
    }
  });

  mockLogger = loggingSystemMock.createLogger();
});

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
    mockLogger,
    stream
  );
  const csvResult = await generateCsv.generateData();
  expect(content).toMatchSnapshot();
  expect(csvResult.csv_contains_formulas).toBe(false);
});

it('formats a search result to CSV content', async () => {
  mockDataClient.search = jest.fn().mockImplementation(() =>
    Rx.of({
      rawResponse: getMockRawResponse([
        {
          fields: {
            date: `["2020-12-31T00:14:28.000Z"]`,
            ip: `["110.135.176.89"]`,
            message: `["This is a great message!"]`,
          },
        } as unknown as estypes.SearchHit,
      ]),
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
    mockLogger,
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
      rawResponse: getMockRawResponse(
        range(0, HITS_TOTAL).map(
          () =>
            ({
              fields: {
                message: ['this is a great message'],
              },
            } as unknown as estypes.SearchHit)
        )
      ),
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
    mockLogger,
    stream
  );
  const csvResult = await generateCsv.generateData();
  expect(csvResult.max_size_reached).toBe(false);
  expect(csvResult.warnings).toEqual([]);
});

it('warns if max size was reached', async () => {
  const TEST_MAX_SIZE = 500;
  mockConfig = getMockConfig({
    csv: {
      checkForFormulas: true,
      escapeFormulaValues: true,
      maxSizeBytes: TEST_MAX_SIZE,
      scroll: { size: 500, duration: '30s' },
    },
  });

  mockDataClient.search = jest.fn().mockImplementation(() =>
    Rx.of({
      rawResponse: getMockRawResponse(
        range(0, HITS_TOTAL).map(
          () =>
            ({
              fields: {
                date: ['2020-12-31T00:14:28.000Z'],
                ip: ['110.135.176.89'],
                message: ['super cali fragile istic XPLA docious'],
              },
            } as unknown as estypes.SearchHit)
        )
      ),
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
    mockLogger,
    stream
  );
  const csvResult = await generateCsv.generateData();
  expect(csvResult.max_size_reached).toBe(true);
  expect(csvResult.warnings).toEqual([]);
  expect(content).toMatchSnapshot();
});

it('uses the pit ID to page all the data', async () => {
  mockDataClient.search = jest
    .fn()
    .mockImplementationOnce(() =>
      Rx.of({
        rawResponse: getMockRawResponse(
          range(0, HITS_TOTAL / 10).map(
            () =>
              ({
                fields: {
                  date: ['2020-12-31T00:14:28.000Z'],
                  ip: ['110.135.176.89'],
                  message: ['hit from the initial search'],
                },
              } as unknown as estypes.SearchHit)
          ),
          HITS_TOTAL
        ),
      })
    )
    .mockImplementation(() =>
      Rx.of({
        rawResponse: getMockRawResponse(
          range(0, HITS_TOTAL / 10).map(
            () =>
              ({
                fields: {
                  date: ['2020-12-31T00:14:28.000Z'],
                  ip: ['110.135.176.89'],
                  message: ['hit from a subsequent scroll'],
                },
              } as unknown as estypes.SearchHit)
          )
        ),
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
    mockLogger,
    stream
  );
  const csvResult = await generateCsv.generateData();
  expect(csvResult.warnings).toEqual([]);
  expect(content).toMatchSnapshot();

  expect(mockDataClient.search).toHaveBeenCalledTimes(10);
  expect(mockDataClient.search).toBeCalledWith(
    { params: { body: {}, ignore_throttled: undefined } },
    { strategy: 'es', transport: { maxRetries: 0, requestTimeout: '30s' } }
  );

  expect(mockEsClient.asCurrentUser.openPointInTime).toHaveBeenCalledTimes(1);
  expect(mockEsClient.asCurrentUser.openPointInTime).toHaveBeenCalledWith(
    {
      ignore_unavailable: true,
      index: 'logstash-*',
      keep_alive: '30s',
    },
    { maxRetries: 0, requestTimeout: '30s' }
  );

  expect(mockEsClient.asCurrentUser.closePointInTime).toHaveBeenCalledTimes(1);
  expect(mockEsClient.asCurrentUser.closePointInTime).toHaveBeenCalledWith({
    body: { id: mockPitId },
  });
});

it('keeps order of the columns during the scroll', async () => {
  mockDataClient.search = jest
    .fn()
    .mockImplementationOnce(() =>
      Rx.of({
        rawResponse: getMockRawResponse(
          [{ fields: { a: ['a1'], b: ['b1'] } } as unknown as estypes.SearchHit],
          3
        ),
      })
    )
    .mockImplementationOnce(() =>
      Rx.of({
        rawResponse: getMockRawResponse(
          [{ fields: { b: ['b2'] } } as unknown as estypes.SearchHit],
          3
        ),
      })
    )
    .mockImplementationOnce(() =>
      Rx.of({
        rawResponse: getMockRawResponse(
          [{ fields: { a: ['a3'], c: ['c3'] } } as unknown as estypes.SearchHit],
          3
        ),
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
    mockLogger,
    stream
  );
  await generateCsv.generateData();

  expect(content).toMatchSnapshot();
});

describe('fields from job.searchSource.getFields() (7.12 generated)', () => {
  it('cells can be multi-value', async () => {
    mockDataClient.search = jest.fn().mockImplementation(() =>
      Rx.of({
        rawResponse: getMockRawResponse([
          {
            _id: 'my-cool-id',
            _index: 'my-cool-index',
            _version: 4,
            fields: {
              sku: [`This is a cool SKU.`, `This is also a cool SKU.`],
            },
          },
        ]),
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
      mockLogger,
      stream
    );
    await generateCsv.generateData();

    expect(content).toMatchSnapshot();
  });

  it('provides top-level underscored fields as columns', async () => {
    mockDataClient.search = jest.fn().mockImplementation(() =>
      Rx.of({
        rawResponse: getMockRawResponse([
          {
            _id: 'my-cool-id',
            _index: 'my-cool-index',
            _version: 4,
            fields: {
              date: ['2020-12-31T00:14:28.000Z'],
              message: [`it's nice to see you`],
            },
          },
        ]),
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
      mockLogger,
      stream
    );

    const csvResult = await generateCsv.generateData();

    expect(content).toMatchSnapshot();
    expect(csvResult.csv_contains_formulas).toBe(false);
  });

  it('sorts the fields when they are to be used as table column names', async () => {
    mockDataClient.search = jest.fn().mockImplementation(() =>
      Rx.of({
        rawResponse: getMockRawResponse([
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
        ]),
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
      mockLogger,
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
        rawResponse: getMockRawResponse([
          {
            _id: 'my-cool-id',
            _index: 'my-cool-index',
            _version: 4,
            fields: {
              product: 'coconut',
              category: [`cool`, `rad`],
            },
          },
        ]),
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
      mockLogger,
      stream
    );
    await generateCsv.generateData();

    expect(content).toMatchSnapshot();
  });

  it('columns can be top-level fields such as _id and _index', async () => {
    mockDataClient.search = jest.fn().mockImplementation(() =>
      Rx.of({
        rawResponse: getMockRawResponse([
          {
            _id: 'my-cool-id',
            _index: 'my-cool-index',
            _version: 4,
            fields: {
              product: 'coconut',
              category: [`cool`, `rad`],
            },
          },
        ]),
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
      mockLogger,
      stream
    );
    await generateCsv.generateData();

    expect(content).toMatchSnapshot();
  });

  it('default column names come from tabify', async () => {
    mockDataClient.search = jest.fn().mockImplementation(() =>
      Rx.of({
        rawResponse: getMockRawResponse([
          {
            _id: 'my-cool-id',
            _index: 'my-cool-index',
            _version: 4,
            fields: {
              product: 'coconut',
              category: [`cool`, `rad`],
            },
          },
        ]),
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
      mockLogger,
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
        rawResponse: getMockRawResponse([
          {
            fields: {
              date: ['2020-12-31T00:14:28.000Z'],
              ip: ['110.135.176.89'],
              message: [TEST_FORMULA],
            },
          } as unknown as estypes.SearchHit,
        ]),
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
      mockLogger,
      stream
    );

    const csvResult = await generateCsv.generateData();

    expect(content).toMatchSnapshot();
    expect(csvResult.csv_contains_formulas).toBe(false);
  });

  it(`escapes formula values in a header, doesn't warn the csv contains formulas`, async () => {
    mockDataClient.search = jest.fn().mockImplementation(() =>
      Rx.of({
        rawResponse: getMockRawResponse([
          {
            fields: {
              date: ['2020-12-31T00:14:28.000Z'],
              ip: ['110.135.176.89'],
              [TEST_FORMULA]: 'This is great data',
            },
          } as unknown as estypes.SearchHit,
        ]),
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
      mockLogger,
      stream
    );

    const csvResult = await generateCsv.generateData();

    expect(content).toMatchSnapshot();
    expect(csvResult.csv_contains_formulas).toBe(false);
  });

  it('can check for formulas, without escaping them', async () => {
    mockConfig = getMockConfig({
      csv: {
        checkForFormulas: true,
        escapeFormulaValues: false,
        maxSizeBytes: 180000,
        scroll: { size: 500, duration: '30s' },
      },
    });
    mockDataClient.search = jest.fn().mockImplementation(() =>
      Rx.of({
        rawResponse: getMockRawResponse([
          {
            fields: {
              date: ['2020-12-31T00:14:28.000Z'],
              ip: ['110.135.176.89'],
              message: [TEST_FORMULA],
            },
          } as unknown as estypes.SearchHit,
        ]),
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
      mockLogger,
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
    mockLogger,
    stream
  );

  await generateCsv.generateData();

  expect(mockDataClient.search).toBeCalledWith(
    {
      params: {
        body: {},
        ignore_throttled: false,
      },
    },
    { strategy: 'es', transport: { maxRetries: 0, requestTimeout: '30s' } }
  );
});

it('adds a warning if export was unable to close the PIT', async () => {
  mockEsClient.asCurrentUser.closePointInTime = jest.fn().mockRejectedValueOnce(
    new esErrors.ResponseError({
      statusCode: 419,
      warnings: [],
      meta: { context: 'test' } as any,
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
    mockLogger,
    stream
  );

  await expect(generateCsv.generateData()).resolves.toMatchInlineSnapshot(`
          Object {
            "content_type": "text/csv",
            "csv_contains_formulas": false,
            "error_code": undefined,
            "max_size_reached": false,
            "metrics": Object {
              "csv": Object {
                "rows": 0,
              },
            },
            "warnings": Array [
              "Unable to close the Point-In-Time used for search. Check the Kibana server logs.",
            ],
          }
        `);
});

it('will return partial data if the scroll or search fails', async () => {
  mockDataClient.search = jest.fn().mockImplementation(() => {
    throw new esErrors.ResponseError({
      statusCode: 500,
      meta: {} as any,
      body: 'my error',
      warnings: [],
    });
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
    mockLogger,
    stream
  );
  await expect(generateCsv.generateData()).resolves.toMatchInlineSnapshot(`
          Object {
            "content_type": "text/csv",
            "csv_contains_formulas": false,
            "error_code": undefined,
            "max_size_reached": false,
            "metrics": Object {
              "csv": Object {
                "rows": 0,
              },
            },
            "warnings": Array [
              "Received a 500 response from Elasticsearch: my error",
              "Encountered an error with the number of CSV rows generated from the search: expected NaN, received 0.",
            ],
          }
        `);
  expect(mockLogger.error.mock.calls).toMatchInlineSnapshot(`
    Array [
      Array [
        "CSV export search error: ResponseError: my error",
      ],
      Array [
        [ResponseError: my error],
      ],
    ]
  `);
});

it('handles unknown errors', async () => {
  mockDataClient.search = jest.fn().mockImplementation(() => {
    throw new Error('An unknown error');
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
    mockLogger,
    stream
  );
  await expect(generateCsv.generateData()).resolves.toMatchInlineSnapshot(`
          Object {
            "content_type": "text/csv",
            "csv_contains_formulas": false,
            "error_code": undefined,
            "max_size_reached": false,
            "metrics": Object {
              "csv": Object {
                "rows": 0,
              },
            },
            "warnings": Array [
              "Encountered an unknown error: An unknown error",
              "Encountered an error with the number of CSV rows generated from the search: expected NaN, received 0.",
            ],
          }
        `);
});

describe('error codes', () => {
  it('returns the expected error code when authentication expires', async () => {
    mockDataClient.search = jest
      .fn()
      .mockImplementationOnce(() =>
        Rx.of({
          rawResponse: getMockRawResponse(
            range(0, 5).map(() => ({
              _index: 'lasdf',
              _id: 'lasdf123',
              fields: {
                date: ['2020-12-31T00:14:28.000Z'],
                ip: ['110.135.176.89'],
                message: ['super cali fragile istic XPLA docious'],
              },
            })),
            10
          ),
        })
      )
      .mockImplementationOnce(() => {
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
      mockLogger,
      stream
    );

    const { error_code: errorCode, warnings } = await generateCsv.generateData();
    expect(errorCode).toBe('authentication_expired_error');
    expect(warnings).toMatchInlineSnapshot(`
      Array [
        "This report contains partial CSV results because the authentication token expired. Export a smaller amount of data or increase the timeout of the authentication token.",
        "Encountered an error with the number of CSV rows generated from the search: expected 10, received 5.",
      ]
    `);

    expect(mockLogger.error.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          "CSV export search error: ResponseError: Response Error",
        ],
        Array [
          [ResponseError: Response Error],
        ],
      ]
    `);
  });
});
