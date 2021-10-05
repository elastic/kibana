/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Writable } from 'stream';
import type { DeeplyMockedKeys } from '@kbn/utility-types/jest';
import nodeCrypto from '@elastic/node-crypto';
import { ElasticsearchClient, IUiSettingsClient } from 'kibana/server';
import moment from 'moment';
import Puid from 'puid';
import sinon from 'sinon';
import { ReportingConfig, ReportingCore } from '../../';
import {
  FieldFormatsRegistry,
  StringFormat,
  FORMATS_UI_SETTINGS,
} from '../../../../../../src/plugins/field_formats/common';
import {
  CSV_QUOTE_VALUES_SETTING,
  CSV_SEPARATOR_SETTING,
} from '../../../../../../src/plugins/share/server';
import { CancellationToken } from '../../../common';
import { CSV_BOM_CHARS } from '../../../common/constants';
import { LevelLogger } from '../../lib';
import { setFieldFormats } from '../../services';
import { createMockConfigSchema, createMockReportingCore } from '../../test_helpers';
import { runTaskFnFactory } from './execute_job';
import { TaskPayloadDeprecatedCSV } from './types';

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(() => resolve(), ms));

const puid = new Puid();
const getRandomScrollId = () => {
  return puid.generate();
};

const getBasePayload = (baseObj: any) => baseObj as TaskPayloadDeprecatedCSV;

describe('CSV Execute Job', function () {
  const encryptionKey = 'testEncryptionKey';
  const headers = {
    sid: 'test',
  };
  const mockLogger = new LevelLogger({
    get: () =>
      ({
        debug: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      } as any),
  });
  let defaultElasticsearchResponse: any;
  let encryptedHeaders: any;

  let configGetStub: any;
  let mockEsClient: DeeplyMockedKeys<ElasticsearchClient>;
  let mockReportingConfig: ReportingConfig;
  let mockReportingCore: ReportingCore;
  let cancellationToken: any;
  let stream: jest.Mocked<Writable>;
  let content: string;

  const mockUiSettingsClient = {
    get: sinon.stub(),
  };

  beforeAll(async function () {
    const crypto = nodeCrypto({ encryptionKey });
    encryptedHeaders = await crypto.encrypt(headers);
  });

  beforeEach(async function () {
    content = '';
    stream = { write: jest.fn((chunk) => (content += chunk)) } as unknown as typeof stream;
    configGetStub = sinon.stub();
    configGetStub.withArgs('queue', 'timeout').returns(moment.duration('2m'));
    configGetStub.withArgs('encryptionKey').returns(encryptionKey);
    configGetStub.withArgs('csv', 'maxSizeBytes').returns(1024 * 1000); // 1mB
    configGetStub.withArgs('csv', 'scroll').returns({});
    mockReportingConfig = { get: configGetStub, kbnConfig: { get: configGetStub } };

    mockReportingCore = await createMockReportingCore(createMockConfigSchema());
    mockReportingCore.getUiSettingsServiceFactory = () =>
      Promise.resolve(mockUiSettingsClient as unknown as IUiSettingsClient);
    mockReportingCore.setConfig(mockReportingConfig);

    mockEsClient = (await mockReportingCore.getEsClient()).asScoped({} as any)
      .asCurrentUser as typeof mockEsClient;
    cancellationToken = new CancellationToken();

    defaultElasticsearchResponse = {
      hits: {
        hits: [],
      },
      _scroll_id: 'defaultScrollId',
    };

    mockEsClient.search.mockResolvedValue({ body: defaultElasticsearchResponse } as any);
    mockEsClient.scroll.mockResolvedValue({ body: defaultElasticsearchResponse } as any);
    mockUiSettingsClient.get.withArgs(CSV_SEPARATOR_SETTING).returns(',');
    mockUiSettingsClient.get.withArgs(CSV_QUOTE_VALUES_SETTING).returns(true);

    setFieldFormats({
      fieldFormatServiceFactory() {
        const uiConfigMock = {};
        (uiConfigMock as any)[FORMATS_UI_SETTINGS.FORMAT_DEFAULT_TYPE_MAP] = {
          _default_: { id: 'string', params: {} },
        };

        const fieldFormatsRegistry = new FieldFormatsRegistry();

        fieldFormatsRegistry.init((key) => (uiConfigMock as any)[key], {}, [StringFormat]);

        return Promise.resolve(fieldFormatsRegistry);
      },
    });
  });

  describe('basic Elasticsearch call behavior', function () {
    it('should decrypt encrypted headers and pass to the elasticsearch client', async function () {
      const runTask = runTaskFnFactory(mockReportingCore, mockLogger);
      await runTask(
        'job456',
        getBasePayload({
          headers: encryptedHeaders,
          fields: [],
          searchRequest: { index: null, body: null },
        }),
        cancellationToken,
        stream
      );
      expect(mockEsClient.search).toHaveBeenCalled();
    });

    it('should pass the index and body to execute the initial search', async function () {
      const index = 'index';
      const body = {
        testBody: true,
      };

      const runTask = runTaskFnFactory(mockReportingCore, mockLogger);
      const job = getBasePayload({
        headers: encryptedHeaders,
        fields: [],
        searchRequest: {
          index,
          body,
        },
      });

      await runTask('job777', job, cancellationToken, stream);

      expect(mockEsClient.search).toHaveBeenCalledWith(expect.objectContaining({ body, index }));
    });

    it('should pass the scrollId from the initial search to the subsequent scroll', async function () {
      const scrollId = getRandomScrollId();

      mockEsClient.search.mockResolvedValueOnce({
        body: {
          hits: {
            hits: [{}],
          },
          _scroll_id: scrollId,
        },
      } as any);
      mockEsClient.scroll.mockResolvedValue({ body: defaultElasticsearchResponse } as any);

      const runTask = runTaskFnFactory(mockReportingCore, mockLogger);
      await runTask(
        'job456',
        getBasePayload({
          headers: encryptedHeaders,
          fields: [],
          searchRequest: { index: null, body: null },
        }),
        cancellationToken,
        stream
      );

      expect(mockEsClient.scroll).toHaveBeenCalledWith(
        expect.objectContaining({ body: { scroll_id: scrollId } })
      );
    });

    it('should not execute scroll if there are no hits from the search', async function () {
      const runTask = runTaskFnFactory(mockReportingCore, mockLogger);
      await runTask(
        'job456',
        getBasePayload({
          headers: encryptedHeaders,
          fields: [],
          searchRequest: { index: null, body: null },
        }),
        cancellationToken,
        stream
      );

      expect(mockEsClient.search).toHaveBeenCalled();
      expect(mockEsClient.clearScroll).toHaveBeenCalled();
    });

    it('should stop executing scroll if there are no hits', async function () {
      mockEsClient.search.mockResolvedValueOnce({
        body: {
          hits: {
            hits: [{}],
          },
          _scroll_id: 'scrollId',
        },
      } as any);
      mockEsClient.scroll.mockResolvedValueOnce({
        body: {
          hits: {
            hits: [],
          },
          _scroll_id: 'scrollId',
        },
      } as any);

      const runTask = runTaskFnFactory(mockReportingCore, mockLogger);
      await runTask(
        'job456',
        getBasePayload({
          headers: encryptedHeaders,
          fields: [],
          searchRequest: { index: null, body: null },
        }),
        cancellationToken,
        stream
      );

      expect(mockEsClient.search).toHaveBeenCalled();
      expect(mockEsClient.scroll).toHaveBeenCalled();
      expect(mockEsClient.clearScroll).toHaveBeenCalled();
    });

    it('should call clearScroll with scrollId when there are no more hits', async function () {
      const lastScrollId = getRandomScrollId();
      mockEsClient.search.mockResolvedValueOnce({
        body: {
          hits: {
            hits: [{}],
          },
          _scroll_id: 'scrollId',
        },
      } as any);

      mockEsClient.scroll.mockResolvedValueOnce({
        body: {
          hits: {
            hits: [],
          },
          _scroll_id: lastScrollId,
        },
      } as any);

      const runTask = runTaskFnFactory(mockReportingCore, mockLogger);
      await runTask(
        'job456',
        getBasePayload({
          headers: encryptedHeaders,
          fields: [],
          searchRequest: { index: null, body: null },
        }),
        cancellationToken,
        stream
      );

      expect(mockEsClient.clearScroll).toHaveBeenCalledWith(
        expect.objectContaining({ body: { scroll_id: lastScrollId } })
      );
    });

    it('calls clearScroll when there is an error iterating the hits', async function () {
      const lastScrollId = getRandomScrollId();
      mockEsClient.search.mockResolvedValueOnce({
        body: {
          hits: {
            hits: [
              {
                _source: {
                  one: 'foo',
                  two: 'bar',
                },
              },
            ],
          },
          _scroll_id: lastScrollId,
        },
      } as any);

      const runTask = runTaskFnFactory(mockReportingCore, mockLogger);
      const jobParams = getBasePayload({
        headers: encryptedHeaders,
        fields: ['one', 'two'],
        conflictedTypesFields: undefined,
        searchRequest: { index: null, body: null },
      });
      await expect(
        runTask('job123', jobParams, cancellationToken, stream)
      ).rejects.toMatchInlineSnapshot(`[TypeError: Cannot read property 'indexOf' of undefined]`);

      expect(mockEsClient.clearScroll).toHaveBeenCalledWith(
        expect.objectContaining({ body: { scroll_id: lastScrollId } })
      );
    });
  });

  describe('Warning when cells have formulas', () => {
    it('returns `csv_contains_formulas` when cells contain formulas', async function () {
      configGetStub.withArgs('csv', 'checkForFormulas').returns(true);
      mockEsClient.search.mockResolvedValueOnce({
        body: {
          hits: {
            hits: [{ _source: { one: '=SUM(A1:A2)', two: 'bar' } }],
          },
          _scroll_id: 'scrollId',
        },
      } as any);

      const runTask = runTaskFnFactory(mockReportingCore, mockLogger);
      const jobParams = getBasePayload({
        headers: encryptedHeaders,
        fields: ['one', 'two'],
        conflictedTypesFields: [],
        searchRequest: { index: null, body: null },
      });
      const { csv_contains_formulas: csvContainsFormulas } = await runTask(
        'job123',
        jobParams,
        cancellationToken,
        stream
      );

      expect(csvContainsFormulas).toEqual(true);
    });

    it('returns warnings when headings contain formulas', async function () {
      configGetStub.withArgs('csv', 'checkForFormulas').returns(true);
      mockEsClient.search.mockResolvedValueOnce({
        body: {
          hits: {
            hits: [{ _source: { '=SUM(A1:A2)': 'foo', two: 'bar' } }],
          },
          _scroll_id: 'scrollId',
        },
      } as any);

      const runTask = runTaskFnFactory(mockReportingCore, mockLogger);
      const jobParams = getBasePayload({
        headers: encryptedHeaders,
        fields: ['=SUM(A1:A2)', 'two'],
        conflictedTypesFields: [],
        searchRequest: { index: null, body: null },
      });
      const { csv_contains_formulas: csvContainsFormulas } = await runTask(
        'job123',
        jobParams,
        cancellationToken,
        stream
      );

      expect(csvContainsFormulas).toEqual(true);
    });

    it('returns no warnings when cells have no formulas', async function () {
      configGetStub.withArgs('csv', 'checkForFormulas').returns(true);
      configGetStub.withArgs('csv', 'escapeFormulaValues').returns(false);
      mockEsClient.search.mockResolvedValueOnce({
        body: {
          hits: {
            hits: [{ _source: { one: 'foo', two: 'bar' } }],
          },
          _scroll_id: 'scrollId',
        },
      } as any);

      const runTask = runTaskFnFactory(mockReportingCore, mockLogger);
      const jobParams = getBasePayload({
        headers: encryptedHeaders,
        fields: ['one', 'two'],
        conflictedTypesFields: [],
        searchRequest: { index: null, body: null },
      });
      const { csv_contains_formulas: csvContainsFormulas } = await runTask(
        'job123',
        jobParams,
        cancellationToken,
        stream
      );

      expect(csvContainsFormulas).toEqual(false);
    });

    it('returns no warnings when cells have formulas but are escaped', async function () {
      configGetStub.withArgs('csv', 'checkForFormulas').returns(true);
      configGetStub.withArgs('csv', 'escapeFormulaValues').returns(true);
      mockEsClient.search.mockResolvedValueOnce({
        body: {
          hits: {
            hits: [{ _source: { '=SUM(A1:A2)': 'foo', two: 'bar' } }],
          },
          _scroll_id: 'scrollId',
        },
      } as any);

      const runTask = runTaskFnFactory(mockReportingCore, mockLogger);
      const jobParams = getBasePayload({
        headers: encryptedHeaders,
        fields: ['=SUM(A1:A2)', 'two'],
        conflictedTypesFields: [],
        searchRequest: { index: null, body: null },
      });

      const { csv_contains_formulas: csvContainsFormulas } = await runTask(
        'job123',
        jobParams,
        cancellationToken,
        stream
      );

      expect(csvContainsFormulas).toEqual(false);
    });

    it('returns no warnings when configured not to', async () => {
      configGetStub.withArgs('csv', 'checkForFormulas').returns(false);
      mockEsClient.search.mockResolvedValueOnce({
        body: {
          hits: {
            hits: [{ _source: { one: '=SUM(A1:A2)', two: 'bar' } }],
          },
          _scroll_id: 'scrollId',
        },
      } as any);

      const runTask = runTaskFnFactory(mockReportingCore, mockLogger);
      const jobParams = getBasePayload({
        headers: encryptedHeaders,
        fields: ['one', 'two'],
        conflictedTypesFields: [],
        searchRequest: { index: null, body: null },
      });
      const { csv_contains_formulas: csvContainsFormulas } = await runTask(
        'job123',
        jobParams,
        cancellationToken,
        stream
      );

      expect(csvContainsFormulas).toEqual(false);
    });
  });

  describe('Byte order mark encoding', () => {
    it('encodes CSVs with BOM', async () => {
      configGetStub.withArgs('csv', 'useByteOrderMarkEncoding').returns(true);
      mockEsClient.search.mockResolvedValueOnce({
        body: {
          hits: {
            hits: [{ _source: { one: 'one', two: 'bar' } }],
          },
          _scroll_id: 'scrollId',
        },
      } as any);

      const runTask = runTaskFnFactory(mockReportingCore, mockLogger);
      const jobParams = getBasePayload({
        headers: encryptedHeaders,
        fields: ['one', 'two'],
        conflictedTypesFields: [],
        searchRequest: { index: null, body: null },
      });
      await runTask('job123', jobParams, cancellationToken, stream);

      expect(content).toEqual(`${CSV_BOM_CHARS}one,two\none,bar\n`);
    });

    it('encodes CSVs without BOM', async () => {
      configGetStub.withArgs('csv', 'useByteOrderMarkEncoding').returns(false);
      mockEsClient.search.mockResolvedValueOnce({
        body: {
          hits: {
            hits: [{ _source: { one: 'one', two: 'bar' } }],
          },
          _scroll_id: 'scrollId',
        },
      } as any);

      const runTask = runTaskFnFactory(mockReportingCore, mockLogger);
      const jobParams = getBasePayload({
        headers: encryptedHeaders,
        fields: ['one', 'two'],
        conflictedTypesFields: [],
        searchRequest: { index: null, body: null },
      });
      await runTask('job123', jobParams, cancellationToken, stream);

      expect(content).toEqual('one,two\none,bar\n');
    });
  });

  describe('Escaping cells with formulas', () => {
    it('escapes values with formulas', async () => {
      configGetStub.withArgs('csv', 'escapeFormulaValues').returns(true);
      mockEsClient.search.mockResolvedValueOnce({
        body: {
          hits: {
            hits: [{ _source: { one: `=cmd|' /C calc'!A0`, two: 'bar' } }],
          },
          _scroll_id: 'scrollId',
        },
      } as any);

      const runTask = runTaskFnFactory(mockReportingCore, mockLogger);
      const jobParams = getBasePayload({
        headers: encryptedHeaders,
        fields: ['one', 'two'],
        conflictedTypesFields: [],
        searchRequest: { index: null, body: null },
      });
      await runTask('job123', jobParams, cancellationToken, stream);

      expect(content).toEqual("one,two\n\"'=cmd|' /C calc'!A0\",bar\n");
    });

    it('does not escapes values with formulas', async () => {
      configGetStub.withArgs('csv', 'escapeFormulaValues').returns(false);
      mockEsClient.search.mockResolvedValueOnce({
        body: {
          hits: {
            hits: [{ _source: { one: `=cmd|' /C calc'!A0`, two: 'bar' } }],
          },
          _scroll_id: 'scrollId',
        },
      } as any);

      const runTask = runTaskFnFactory(mockReportingCore, mockLogger);
      const jobParams = getBasePayload({
        headers: encryptedHeaders,
        fields: ['one', 'two'],
        conflictedTypesFields: [],
        searchRequest: { index: null, body: null },
      });
      await runTask('job123', jobParams, cancellationToken, stream);

      expect(content).toEqual('one,two\n"=cmd|\' /C calc\'!A0",bar\n');
    });
  });

  describe('Elasticsearch call errors', function () {
    it('should reject Promise if search call errors out', async function () {
      mockEsClient.search.mockRejectedValueOnce(new Error());
      const runTask = runTaskFnFactory(mockReportingCore, mockLogger);
      const jobParams = getBasePayload({
        headers: encryptedHeaders,
        fields: [],
        searchRequest: { index: null, body: null },
      });
      await expect(
        runTask('job123', jobParams, cancellationToken, stream)
      ).rejects.toMatchInlineSnapshot(`[Error]`);
    });

    it('should reject Promise if scroll call errors out', async function () {
      mockEsClient.search.mockResolvedValueOnce({
        body: {
          hits: {
            hits: [{}],
          },
          _scroll_id: 'scrollId',
        },
      } as any);
      mockEsClient.scroll.mockRejectedValueOnce(new Error());
      const runTask = runTaskFnFactory(mockReportingCore, mockLogger);
      const jobParams = getBasePayload({
        headers: encryptedHeaders,
        fields: [],
        searchRequest: { index: null, body: null },
      });
      await expect(
        runTask('job123', jobParams, cancellationToken, stream)
      ).rejects.toMatchInlineSnapshot(`[Error]`);
    });
  });

  describe('invalid responses', function () {
    it('should reject Promise if search returns hits but no _scroll_id', async function () {
      mockEsClient.search.mockResolvedValueOnce({
        body: {
          hits: {
            hits: [{}],
          },
          _scroll_id: undefined,
        },
      } as any);

      const runTask = runTaskFnFactory(mockReportingCore, mockLogger);
      const jobParams = getBasePayload({
        headers: encryptedHeaders,
        fields: [],
        searchRequest: { index: null, body: null },
      });
      await expect(
        runTask('job123', jobParams, cancellationToken, stream)
      ).rejects.toMatchInlineSnapshot(
        `[Error: Expected _scroll_id in the following Elasticsearch response: {"hits":{"hits":[{}]}}]`
      );
    });

    it('should reject Promise if search returns no hits and no _scroll_id', async function () {
      mockEsClient.search.mockResolvedValueOnce({
        body: {
          hits: {
            hits: [],
          },
          _scroll_id: undefined,
        },
      } as any);

      const runTask = runTaskFnFactory(mockReportingCore, mockLogger);
      const jobParams = getBasePayload({
        headers: encryptedHeaders,
        fields: [],
        searchRequest: { index: null, body: null },
      });
      await expect(
        runTask('job123', jobParams, cancellationToken, stream)
      ).rejects.toMatchInlineSnapshot(
        `[Error: Expected _scroll_id in the following Elasticsearch response: {"hits":{"hits":[]}}]`
      );
    });

    it('should reject Promise if scroll returns hits but no _scroll_id', async function () {
      mockEsClient.search.mockResolvedValueOnce({
        body: {
          hits: {
            hits: [{}],
          },
          _scroll_id: 'scrollId',
        },
      } as any);

      mockEsClient.scroll.mockResolvedValueOnce({
        body: {
          hits: {
            hits: [{}],
          },
          _scroll_id: undefined,
        },
      } as any);

      const runTask = runTaskFnFactory(mockReportingCore, mockLogger);
      const jobParams = getBasePayload({
        headers: encryptedHeaders,
        fields: [],
        searchRequest: { index: null, body: null },
      });
      await expect(
        runTask('job123', jobParams, cancellationToken, stream)
      ).rejects.toMatchInlineSnapshot(
        `[Error: Expected _scroll_id in the following Elasticsearch response: {"hits":{"hits":[{}]}}]`
      );
    });

    it('should reject Promise if scroll returns no hits and no _scroll_id', async function () {
      mockEsClient.search.mockResolvedValueOnce({
        body: {
          hits: {
            hits: [{}],
          },
          _scroll_id: 'scrollId',
        },
      } as any);

      mockEsClient.scroll.mockResolvedValueOnce({
        body: {
          hits: {
            hits: [],
          },
          _scroll_id: undefined,
        },
      } as any);

      const runTask = runTaskFnFactory(mockReportingCore, mockLogger);
      const jobParams = getBasePayload({
        headers: encryptedHeaders,
        fields: [],
        searchRequest: { index: null, body: null },
      });
      await expect(
        runTask('job123', jobParams, cancellationToken, stream)
      ).rejects.toMatchInlineSnapshot(
        `[Error: Expected _scroll_id in the following Elasticsearch response: {"hits":{"hits":[]}}]`
      );
    });
  });

  describe('cancellation', function () {
    const scrollId = getRandomScrollId();

    beforeEach(function () {
      const searchStub = async () => {
        await delay(1);
        return {
          body: {
            hits: {
              hits: [{}],
            },
            _scroll_id: scrollId,
          },
        };
      };

      mockEsClient.search.mockImplementation(searchStub as typeof mockEsClient.search);
      mockEsClient.scroll.mockImplementation(searchStub as typeof mockEsClient.scroll);
    });

    it('should stop calling Elasticsearch when cancellationToken.cancel is called', async function () {
      const runTask = runTaskFnFactory(mockReportingCore, mockLogger);
      runTask(
        'job345',
        getBasePayload({
          headers: encryptedHeaders,
          fields: [],
          searchRequest: { index: null, body: null },
        }),
        cancellationToken,
        stream
      );

      await delay(250);

      expect(mockEsClient.search).toHaveBeenCalled();
      expect(mockEsClient.scroll).toHaveBeenCalled();
      expect(mockEsClient.clearScroll).not.toHaveBeenCalled();

      cancellationToken.cancel();
      await delay(250);

      expect(mockEsClient.clearScroll).toHaveBeenCalled();
    });

    it(`shouldn't call clearScroll if it never got a scrollId`, async function () {
      const runTask = runTaskFnFactory(mockReportingCore, mockLogger);
      runTask(
        'job345',
        getBasePayload({
          headers: encryptedHeaders,
          fields: [],
          searchRequest: { index: null, body: null },
        }),
        cancellationToken,
        stream
      );
      cancellationToken.cancel();

      expect(mockEsClient.clearScroll).not.toHaveBeenCalled();
    });

    it('should call clearScroll if it got a scrollId', async function () {
      const runTask = runTaskFnFactory(mockReportingCore, mockLogger);
      runTask(
        'job345',
        getBasePayload({
          headers: encryptedHeaders,
          fields: [],
          searchRequest: { index: null, body: null },
        }),
        cancellationToken,
        stream
      );
      await delay(100);
      cancellationToken.cancel();
      await delay(100);

      expect(mockEsClient.clearScroll).toHaveBeenCalledWith(
        expect.objectContaining({
          body: { scroll_id: scrollId },
        })
      );
    });
  });

  describe('csv content', function () {
    it('should write column headers to output, even if there are no results', async function () {
      const runTask = runTaskFnFactory(mockReportingCore, mockLogger);
      const jobParams = getBasePayload({
        headers: encryptedHeaders,
        fields: ['one', 'two'],
        searchRequest: { index: null, body: null },
      });
      await runTask('job123', jobParams, cancellationToken, stream);
      expect(content).toBe(`one,two\n`);
    });

    it('should use custom uiSettings csv:separator for header', async function () {
      mockUiSettingsClient.get.withArgs(CSV_SEPARATOR_SETTING).returns(';');
      const runTask = runTaskFnFactory(mockReportingCore, mockLogger);
      const jobParams = getBasePayload({
        headers: encryptedHeaders,
        fields: ['one', 'two'],
        searchRequest: { index: null, body: null },
      });
      await runTask('job123', jobParams, cancellationToken, stream);
      expect(content).toBe(`one;two\n`);
    });

    it('should escape column headers if uiSettings csv:quoteValues is true', async function () {
      mockUiSettingsClient.get.withArgs(CSV_QUOTE_VALUES_SETTING).returns(true);
      const runTask = runTaskFnFactory(mockReportingCore, mockLogger);
      const jobParams = getBasePayload({
        headers: encryptedHeaders,
        fields: ['one and a half', 'two', 'three-and-four', 'five & six'],
        searchRequest: { index: null, body: null },
      });
      await runTask('job123', jobParams, cancellationToken, stream);
      expect(content).toBe(`"one and a half",two,"three-and-four","five & six"\n`);
    });

    it(`shouldn't escape column headers if uiSettings csv:quoteValues is false`, async function () {
      mockUiSettingsClient.get.withArgs(CSV_QUOTE_VALUES_SETTING).returns(false);
      const runTask = runTaskFnFactory(mockReportingCore, mockLogger);
      const jobParams = getBasePayload({
        headers: encryptedHeaders,
        fields: ['one and a half', 'two', 'three-and-four', 'five & six'],
        searchRequest: { index: null, body: null },
      });
      await runTask('job123', jobParams, cancellationToken, stream);
      expect(content).toBe(`one and a half,two,three-and-four,five & six\n`);
    });

    it('should write column headers to output, when there are results', async function () {
      const runTask = runTaskFnFactory(mockReportingCore, mockLogger);
      mockEsClient.search.mockResolvedValueOnce({
        body: {
          hits: {
            hits: [{ one: '1', two: '2' }],
          },
          _scroll_id: 'scrollId',
        },
      } as any);

      const jobParams = getBasePayload({
        headers: encryptedHeaders,
        fields: ['one', 'two'],
        searchRequest: { index: null, body: null },
      });
      await runTask('job123', jobParams, cancellationToken, stream);
      expect(content).not.toBe(null);
      const lines = content!.split('\n');
      const headerLine = lines[0];
      expect(headerLine).toBe('one,two');
    });

    it('should use comma separated values of non-nested fields from _source', async function () {
      const runTask = runTaskFnFactory(mockReportingCore, mockLogger);
      mockEsClient.search.mockResolvedValueOnce({
        body: {
          hits: {
            hits: [{ _source: { one: 'foo', two: 'bar' } }],
          },
          _scroll_id: 'scrollId',
        },
      } as any);

      const jobParams = getBasePayload({
        headers: encryptedHeaders,
        fields: ['one', 'two'],
        conflictedTypesFields: [],
        searchRequest: { index: null, body: null },
      });
      await runTask('job123', jobParams, cancellationToken, stream);
      expect(content).not.toBe(null);
      const lines = content!.split('\n');
      const valuesLine = lines[1];
      expect(valuesLine).toBe('foo,bar');
    });

    it('should concatenate the hits from multiple responses', async function () {
      const runTask = runTaskFnFactory(mockReportingCore, mockLogger);
      mockEsClient.search.mockResolvedValueOnce({
        body: {
          hits: {
            hits: [{ _source: { one: 'foo', two: 'bar' } }],
          },
          _scroll_id: 'scrollId',
        },
      } as any);
      mockEsClient.scroll.mockResolvedValueOnce({
        body: {
          hits: {
            hits: [{ _source: { one: 'baz', two: 'qux' } }],
          },
          _scroll_id: 'scrollId',
        },
      } as any);

      const jobParams = getBasePayload({
        headers: encryptedHeaders,
        fields: ['one', 'two'],
        conflictedTypesFields: [],
        searchRequest: { index: null, body: null },
      });
      await runTask('job123', jobParams, cancellationToken, stream);
      expect(content).not.toBe(null);
      const lines = content!.split('\n');

      expect(lines[1]).toBe('foo,bar');
      expect(lines[2]).toBe('baz,qux');
    });

    it('should use field formatters to format fields', async function () {
      const runTask = runTaskFnFactory(mockReportingCore, mockLogger);
      mockEsClient.search.mockResolvedValueOnce({
        body: {
          hits: {
            hits: [{ _source: { one: 'foo', two: 'bar' } }],
          },
          _scroll_id: 'scrollId',
        },
      } as any);

      const jobParams = getBasePayload({
        headers: encryptedHeaders,
        fields: ['one', 'two'],
        conflictedTypesFields: [],
        searchRequest: { index: null, body: null },
        indexPatternSavedObject: {
          id: 'logstash-*',
          type: 'index-pattern',
          attributes: {
            title: 'logstash-*',
            fields: '[{"name":"one","type":"string"}, {"name":"two","type":"string"}]',
            fieldFormatMap: '{"one":{"id":"string","params":{"transform": "upper"}}}',
          },
        },
      });
      await runTask('job123', jobParams, cancellationToken, stream);
      expect(content).not.toBe(null);
      const lines = content!.split('\n');

      expect(lines[1]).toBe('FOO,bar');
    });
  });

  describe('maxSizeBytes', function () {
    // The following tests use explicitly specified lengths. UTF-8 uses between one and four 8-bit bytes for each
    // code-point. However, any character that can be represented by ASCII requires one-byte, so a majority of the
    // tests use these 'simple' characters to make the math easier

    describe('when only the headers exceed the maxSizeBytes', function () {
      let maxSizeReached: boolean | undefined;

      beforeEach(async function () {
        configGetStub.withArgs('csv', 'maxSizeBytes').returns(1);

        const runTask = runTaskFnFactory(mockReportingCore, mockLogger);
        const jobParams = getBasePayload({
          headers: encryptedHeaders,
          fields: ['one', 'two'],
          searchRequest: { index: null, body: null },
        });

        ({ max_size_reached: maxSizeReached } = await runTask(
          'job123',
          jobParams,
          cancellationToken,
          stream
        ));
      });

      it('should return max_size_reached', function () {
        expect(maxSizeReached).toBe(true);
      });

      it('should return empty content', function () {
        expect(content).toBe('');
      });
    });

    describe('when headers are equal to maxSizeBytes', function () {
      let maxSizeReached: boolean | undefined;

      beforeEach(async function () {
        configGetStub.withArgs('csv', 'maxSizeBytes').returns(9);

        const runTask = runTaskFnFactory(mockReportingCore, mockLogger);
        const jobParams = getBasePayload({
          headers: encryptedHeaders,
          fields: ['one', 'two'],
          searchRequest: { index: null, body: null },
        });

        ({ max_size_reached: maxSizeReached } = await runTask(
          'job123',
          jobParams,
          cancellationToken,
          stream
        ));
      });

      it(`shouldn't return max_size_reached`, function () {
        expect(maxSizeReached).toBe(false);
      });

      it(`should return content`, function () {
        expect(content).toBe('one,two\n');
      });
    });

    describe('when the data exceeds the maxSizeBytes', function () {
      let maxSizeReached: boolean | undefined;

      beforeEach(async function () {
        configGetStub.withArgs('csv', 'maxSizeBytes').returns(9);

        mockEsClient.search.mockResolvedValueOnce({
          body: {
            hits: {
              hits: [{ _source: { one: 'foo', two: 'bar' } }],
            },
            _scroll_id: 'scrollId',
          },
        } as any);

        const runTask = runTaskFnFactory(mockReportingCore, mockLogger);
        const jobParams = getBasePayload({
          headers: encryptedHeaders,
          fields: ['one', 'two'],
          conflictedTypesFields: [],
          searchRequest: { index: null, body: null },
        });

        ({ max_size_reached: maxSizeReached } = await runTask(
          'job123',
          jobParams,
          cancellationToken,
          stream
        ));
      });

      it(`should return max_size_reached`, function () {
        expect(maxSizeReached).toBe(true);
      });

      it(`should return the headers in the content`, function () {
        expect(content).toBe('one,two\n');
      });
    });

    describe('when headers and data equal the maxSizeBytes', function () {
      let maxSizeReached: boolean | undefined;

      beforeEach(async function () {
        mockReportingCore.getUiSettingsServiceFactory = () =>
          Promise.resolve(mockUiSettingsClient as unknown as IUiSettingsClient);
        configGetStub.withArgs('csv', 'maxSizeBytes').returns(18);

        mockEsClient.search.mockResolvedValueOnce({
          body: {
            hits: {
              hits: [{ _source: { one: 'foo', two: 'bar' } }],
            },
            _scroll_id: 'scrollId',
          },
        } as any);

        const runTask = runTaskFnFactory(mockReportingCore, mockLogger);
        const jobParams = getBasePayload({
          headers: encryptedHeaders,
          fields: ['one', 'two'],
          conflictedTypesFields: [],
          searchRequest: { index: null, body: null },
        });

        ({ max_size_reached: maxSizeReached } = await runTask(
          'job123',
          jobParams,
          cancellationToken,
          stream
        ));
      });

      it(`shouldn't return max_size_reached`, async function () {
        expect(maxSizeReached).toBe(false);
      });

      it('should return headers and data in content', function () {
        expect(content).toBe('one,two\nfoo,bar\n');
      });
    });
  });

  describe('scroll settings', function () {
    it('passes scroll duration to initial search call', async function () {
      const scrollDuration = 'test';
      configGetStub.withArgs('csv', 'scroll').returns({ duration: scrollDuration });

      mockEsClient.search.mockResolvedValueOnce({
        body: {
          hits: {
            hits: [{}],
          },
          _scroll_id: 'scrollId',
        },
      } as any);

      const runTask = runTaskFnFactory(mockReportingCore, mockLogger);
      const jobParams = getBasePayload({
        headers: encryptedHeaders,
        fields: ['one', 'two'],
        conflictedTypesFields: [],
        searchRequest: { index: null, body: null },
      });

      await runTask('job123', jobParams, cancellationToken, stream);

      expect(mockEsClient.search).toHaveBeenCalledWith(
        expect.objectContaining({ scroll: scrollDuration })
      );
    });

    it('passes scroll size to initial search call', async function () {
      const scrollSize = 100;
      configGetStub.withArgs('csv', 'scroll').returns({ size: scrollSize });

      mockEsClient.search.mockResolvedValueOnce({
        body: {
          hits: {
            hits: [{}],
          },
          _scroll_id: 'scrollId',
        },
      } as any);

      const runTask = runTaskFnFactory(mockReportingCore, mockLogger);
      const jobParams = getBasePayload({
        headers: encryptedHeaders,
        fields: ['one', 'two'],
        conflictedTypesFields: [],
        searchRequest: { index: null, body: null },
      });

      await runTask('job123', jobParams, cancellationToken, stream);

      expect(mockEsClient.search).toHaveBeenCalledWith(
        expect.objectContaining({ size: scrollSize })
      );
    });

    it('passes scroll duration to subsequent scroll call', async function () {
      const scrollDuration = 'test';
      configGetStub.withArgs('csv', 'scroll').returns({ duration: scrollDuration });

      mockEsClient.search.mockResolvedValueOnce({
        body: {
          hits: {
            hits: [{}],
          },
          _scroll_id: 'scrollId',
        },
      } as any);

      const runTask = runTaskFnFactory(mockReportingCore, mockLogger);
      const jobParams = getBasePayload({
        headers: encryptedHeaders,
        fields: ['one', 'two'],
        conflictedTypesFields: [],
        searchRequest: { index: null, body: null },
      });

      await runTask('job123', jobParams, cancellationToken, stream);

      expect(mockEsClient.scroll).toHaveBeenCalledWith(
        expect.objectContaining({ body: { scroll: scrollDuration, scroll_id: 'scrollId' } })
      );
    });
  });
});
