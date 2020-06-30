/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import nodeCrypto from '@elastic/node-crypto';
import { IUiSettingsClient, ElasticsearchServiceSetup } from 'kibana/server';
// @ts-ignore
import Puid from 'puid';
import sinon from 'sinon';
import { ReportingConfig, ReportingCore } from '../../../';
import { fieldFormats, UI_SETTINGS } from '../../../../../../../src/plugins/data/server';
import {
  CSV_QUOTE_VALUES_SETTING,
  CSV_SEPARATOR_SETTING,
} from '../../../../../../../src/plugins/share/server';
import { CancellationToken } from '../../../../common';
import { CSV_BOM_CHARS } from '../../../../common/constants';
import { LevelLogger } from '../../../lib';
import { setFieldFormats } from '../../../services';
import { createMockReportingCore } from '../../../test_helpers';
import { ScheduledTaskParamsCSV } from '../types';
import { runTaskFnFactory } from './execute_job';

const delay = (ms: number) => new Promise((resolve) => setTimeout(() => resolve(), ms));

const puid = new Puid();
const getRandomScrollId = () => {
  return puid.generate();
};

const getScheduledTaskParams = (baseObj: any) => baseObj as ScheduledTaskParamsCSV;

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

  let clusterStub: any;
  let configGetStub: any;
  let mockReportingConfig: ReportingConfig;
  let mockReportingCore: ReportingCore;
  let callAsCurrentUserStub: any;
  let cancellationToken: any;

  const mockElasticsearch = {
    legacy: {
      client: {
        asScoped: () => clusterStub,
      },
    },
  };
  const mockUiSettingsClient = {
    get: sinon.stub(),
  };

  beforeAll(async function () {
    const crypto = nodeCrypto({ encryptionKey });
    encryptedHeaders = await crypto.encrypt(headers);
  });

  beforeEach(async function () {
    configGetStub = sinon.stub();
    configGetStub.withArgs('index').returns('.reporting-foo-test');
    configGetStub.withArgs('encryptionKey').returns(encryptionKey);
    configGetStub.withArgs('csv', 'maxSizeBytes').returns(1024 * 1000); // 1mB
    configGetStub.withArgs('csv', 'scroll').returns({});
    mockReportingConfig = { get: configGetStub, kbnConfig: { get: configGetStub } };

    mockReportingCore = await createMockReportingCore(mockReportingConfig);
    mockReportingCore.getUiSettingsServiceFactory = () =>
      Promise.resolve((mockUiSettingsClient as unknown) as IUiSettingsClient);
    mockReportingCore.getElasticsearchService = () =>
      mockElasticsearch as ElasticsearchServiceSetup;
    mockReportingCore.setConfig(mockReportingConfig);

    cancellationToken = new CancellationToken();

    defaultElasticsearchResponse = {
      hits: {
        hits: [],
      },
      _scroll_id: 'defaultScrollId',
    };
    clusterStub = {
      callAsCurrentUser() {},
    };

    callAsCurrentUserStub = sinon
      .stub(clusterStub, 'callAsCurrentUser')
      .resolves(defaultElasticsearchResponse);

    mockUiSettingsClient.get.withArgs(CSV_SEPARATOR_SETTING).returns(',');
    mockUiSettingsClient.get.withArgs(CSV_QUOTE_VALUES_SETTING).returns(true);

    setFieldFormats({
      fieldFormatServiceFactory() {
        const uiConfigMock = {};
        (uiConfigMock as any)[UI_SETTINGS.FORMAT_DEFAULT_TYPE_MAP] = {
          _default_: { id: 'string', params: {} },
        };

        const fieldFormatsRegistry = new fieldFormats.FieldFormatsRegistry();

        fieldFormatsRegistry.init((key) => (uiConfigMock as any)[key], {}, [
          fieldFormats.StringFormat,
        ]);

        return Promise.resolve(fieldFormatsRegistry);
      },
    });
  });

  describe('basic Elasticsearch call behavior', function () {
    it('should decrypt encrypted headers and pass to callAsCurrentUser', async function () {
      const runTask = await runTaskFnFactory(mockReportingCore, mockLogger);
      await runTask(
        'job456',
        getScheduledTaskParams({
          headers: encryptedHeaders,
          fields: [],
          searchRequest: { index: null, body: null },
        }),
        cancellationToken
      );
      expect(callAsCurrentUserStub.called).toBe(true);
      expect(callAsCurrentUserStub.firstCall.args[0]).toEqual('search');
    });

    it('should pass the index and body to execute the initial search', async function () {
      const index = 'index';
      const body = {
        testBody: true,
      };

      const runTask = await runTaskFnFactory(mockReportingCore, mockLogger);
      const job = getScheduledTaskParams({
        headers: encryptedHeaders,
        fields: [],
        searchRequest: {
          index,
          body,
        },
      });

      await runTask('job777', job, cancellationToken);

      const searchCall = callAsCurrentUserStub.firstCall;
      expect(searchCall.args[0]).toBe('search');
      expect(searchCall.args[1].index).toBe(index);
      expect(searchCall.args[1].body).toBe(body);
    });

    it('should pass the scrollId from the initial search to the subsequent scroll', async function () {
      const scrollId = getRandomScrollId();
      callAsCurrentUserStub.onFirstCall().resolves({
        hits: {
          hits: [{}],
        },
        _scroll_id: scrollId,
      });
      callAsCurrentUserStub.onSecondCall().resolves(defaultElasticsearchResponse);
      const runTask = await runTaskFnFactory(mockReportingCore, mockLogger);
      await runTask(
        'job456',
        getScheduledTaskParams({
          headers: encryptedHeaders,
          fields: [],
          searchRequest: { index: null, body: null },
        }),
        cancellationToken
      );

      const scrollCall = callAsCurrentUserStub.secondCall;

      expect(scrollCall.args[0]).toBe('scroll');
      expect(scrollCall.args[1].scrollId).toBe(scrollId);
    });

    it('should not execute scroll if there are no hits from the search', async function () {
      const runTask = await runTaskFnFactory(mockReportingCore, mockLogger);
      await runTask(
        'job456',
        getScheduledTaskParams({
          headers: encryptedHeaders,
          fields: [],
          searchRequest: { index: null, body: null },
        }),
        cancellationToken
      );

      expect(callAsCurrentUserStub.callCount).toBe(2);

      const searchCall = callAsCurrentUserStub.firstCall;
      expect(searchCall.args[0]).toBe('search');

      const clearScrollCall = callAsCurrentUserStub.secondCall;
      expect(clearScrollCall.args[0]).toBe('clearScroll');
    });

    it('should stop executing scroll if there are no hits', async function () {
      callAsCurrentUserStub.onFirstCall().resolves({
        hits: {
          hits: [{}],
        },
        _scroll_id: 'scrollId',
      });
      callAsCurrentUserStub.onSecondCall().resolves({
        hits: {
          hits: [],
        },
        _scroll_id: 'scrollId',
      });

      const runTask = await runTaskFnFactory(mockReportingCore, mockLogger);
      await runTask(
        'job456',
        getScheduledTaskParams({
          headers: encryptedHeaders,
          fields: [],
          searchRequest: { index: null, body: null },
        }),
        cancellationToken
      );

      expect(callAsCurrentUserStub.callCount).toBe(3);

      const searchCall = callAsCurrentUserStub.firstCall;
      expect(searchCall.args[0]).toBe('search');

      const scrollCall = callAsCurrentUserStub.secondCall;
      expect(scrollCall.args[0]).toBe('scroll');

      const clearScroll = callAsCurrentUserStub.thirdCall;
      expect(clearScroll.args[0]).toBe('clearScroll');
    });

    it('should call clearScroll with scrollId when there are no more hits', async function () {
      const lastScrollId = getRandomScrollId();
      callAsCurrentUserStub.onFirstCall().resolves({
        hits: {
          hits: [{}],
        },
        _scroll_id: 'scrollId',
      });

      callAsCurrentUserStub.onSecondCall().resolves({
        hits: {
          hits: [],
        },
        _scroll_id: lastScrollId,
      });

      const runTask = await runTaskFnFactory(mockReportingCore, mockLogger);
      await runTask(
        'job456',
        getScheduledTaskParams({
          headers: encryptedHeaders,
          fields: [],
          searchRequest: { index: null, body: null },
        }),
        cancellationToken
      );

      const lastCall = callAsCurrentUserStub.getCall(callAsCurrentUserStub.callCount - 1);
      expect(lastCall.args[0]).toBe('clearScroll');
      expect(lastCall.args[1].scrollId).toEqual([lastScrollId]);
    });

    it('calls clearScroll when there is an error iterating the hits', async function () {
      const lastScrollId = getRandomScrollId();
      callAsCurrentUserStub.onFirstCall().resolves({
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
      });

      const runTask = await runTaskFnFactory(mockReportingCore, mockLogger);
      const jobParams = getScheduledTaskParams({
        headers: encryptedHeaders,
        fields: ['one', 'two'],
        conflictedTypesFields: undefined,
        searchRequest: { index: null, body: null },
      });
      await expect(runTask('job123', jobParams, cancellationToken)).rejects.toMatchInlineSnapshot(
        `[TypeError: Cannot read property 'indexOf' of undefined]`
      );

      const lastCall = callAsCurrentUserStub.getCall(callAsCurrentUserStub.callCount - 1);
      expect(lastCall.args[0]).toBe('clearScroll');
      expect(lastCall.args[1].scrollId).toEqual([lastScrollId]);
    });
  });

  describe('Warning when cells have formulas', () => {
    it('returns `csv_contains_formulas` when cells contain formulas', async function () {
      configGetStub.withArgs('csv', 'checkForFormulas').returns(true);
      callAsCurrentUserStub.onFirstCall().returns({
        hits: {
          hits: [{ _source: { one: '=SUM(A1:A2)', two: 'bar' } }],
        },
        _scroll_id: 'scrollId',
      });

      const runTask = await runTaskFnFactory(mockReportingCore, mockLogger);
      const jobParams = getScheduledTaskParams({
        headers: encryptedHeaders,
        fields: ['one', 'two'],
        conflictedTypesFields: [],
        searchRequest: { index: null, body: null },
      });
      const { csv_contains_formulas: csvContainsFormulas } = await runTask(
        'job123',
        jobParams,
        cancellationToken
      );

      expect(csvContainsFormulas).toEqual(true);
    });

    it('returns warnings when headings contain formulas', async function () {
      configGetStub.withArgs('csv', 'checkForFormulas').returns(true);
      callAsCurrentUserStub.onFirstCall().returns({
        hits: {
          hits: [{ _source: { '=SUM(A1:A2)': 'foo', two: 'bar' } }],
        },
        _scroll_id: 'scrollId',
      });

      const runTask = await runTaskFnFactory(mockReportingCore, mockLogger);
      const jobParams = getScheduledTaskParams({
        headers: encryptedHeaders,
        fields: ['=SUM(A1:A2)', 'two'],
        conflictedTypesFields: [],
        searchRequest: { index: null, body: null },
      });
      const { csv_contains_formulas: csvContainsFormulas } = await runTask(
        'job123',
        jobParams,
        cancellationToken
      );

      expect(csvContainsFormulas).toEqual(true);
    });

    it('returns no warnings when cells have no formulas', async function () {
      configGetStub.withArgs('csv', 'checkForFormulas').returns(true);
      configGetStub.withArgs('csv', 'escapeFormulaValues').returns(false);
      callAsCurrentUserStub.onFirstCall().returns({
        hits: {
          hits: [{ _source: { one: 'foo', two: 'bar' } }],
        },
        _scroll_id: 'scrollId',
      });

      const runTask = await runTaskFnFactory(mockReportingCore, mockLogger);
      const jobParams = getScheduledTaskParams({
        headers: encryptedHeaders,
        fields: ['one', 'two'],
        conflictedTypesFields: [],
        searchRequest: { index: null, body: null },
      });
      const { csv_contains_formulas: csvContainsFormulas } = await runTask(
        'job123',
        jobParams,
        cancellationToken
      );

      expect(csvContainsFormulas).toEqual(false);
    });

    it('returns no warnings when cells have formulas but are escaped', async function () {
      configGetStub.withArgs('csv', 'checkForFormulas').returns(true);
      configGetStub.withArgs('csv', 'escapeFormulaValues').returns(true);
      callAsCurrentUserStub.onFirstCall().returns({
        hits: {
          hits: [{ _source: { '=SUM(A1:A2)': 'foo', two: 'bar' } }],
        },
        _scroll_id: 'scrollId',
      });

      const runTask = await runTaskFnFactory(mockReportingCore, mockLogger);
      const jobParams = getScheduledTaskParams({
        headers: encryptedHeaders,
        fields: ['=SUM(A1:A2)', 'two'],
        conflictedTypesFields: [],
        searchRequest: { index: null, body: null },
      });

      const { csv_contains_formulas: csvContainsFormulas } = await runTask(
        'job123',
        jobParams,
        cancellationToken
      );

      expect(csvContainsFormulas).toEqual(false);
    });

    it('returns no warnings when configured not to', async () => {
      configGetStub.withArgs('csv', 'checkForFormulas').returns(false);
      callAsCurrentUserStub.onFirstCall().returns({
        hits: {
          hits: [{ _source: { one: '=SUM(A1:A2)', two: 'bar' } }],
        },
        _scroll_id: 'scrollId',
      });

      const runTask = await runTaskFnFactory(mockReportingCore, mockLogger);
      const jobParams = getScheduledTaskParams({
        headers: encryptedHeaders,
        fields: ['one', 'two'],
        conflictedTypesFields: [],
        searchRequest: { index: null, body: null },
      });
      const { csv_contains_formulas: csvContainsFormulas } = await runTask(
        'job123',
        jobParams,
        cancellationToken
      );

      expect(csvContainsFormulas).toEqual(false);
    });
  });

  describe('Byte order mark encoding', () => {
    it('encodes CSVs with BOM', async () => {
      configGetStub.withArgs('csv', 'useByteOrderMarkEncoding').returns(true);
      callAsCurrentUserStub.onFirstCall().returns({
        hits: {
          hits: [{ _source: { one: 'one', two: 'bar' } }],
        },
        _scroll_id: 'scrollId',
      });

      const runTask = await runTaskFnFactory(mockReportingCore, mockLogger);
      const jobParams = getScheduledTaskParams({
        headers: encryptedHeaders,
        fields: ['one', 'two'],
        conflictedTypesFields: [],
        searchRequest: { index: null, body: null },
      });
      const { content } = await runTask('job123', jobParams, cancellationToken);

      expect(content).toEqual(`${CSV_BOM_CHARS}one,two\none,bar\n`);
    });

    it('encodes CSVs without BOM', async () => {
      configGetStub.withArgs('csv', 'useByteOrderMarkEncoding').returns(false);
      callAsCurrentUserStub.onFirstCall().returns({
        hits: {
          hits: [{ _source: { one: 'one', two: 'bar' } }],
        },
        _scroll_id: 'scrollId',
      });

      const runTask = await runTaskFnFactory(mockReportingCore, mockLogger);
      const jobParams = getScheduledTaskParams({
        headers: encryptedHeaders,
        fields: ['one', 'two'],
        conflictedTypesFields: [],
        searchRequest: { index: null, body: null },
      });
      const { content } = await runTask('job123', jobParams, cancellationToken);

      expect(content).toEqual('one,two\none,bar\n');
    });
  });

  describe('Escaping cells with formulas', () => {
    it('escapes values with formulas', async () => {
      configGetStub.withArgs('csv', 'escapeFormulaValues').returns(true);
      callAsCurrentUserStub.onFirstCall().returns({
        hits: {
          hits: [{ _source: { one: `=cmd|' /C calc'!A0`, two: 'bar' } }],
        },
        _scroll_id: 'scrollId',
      });

      const runTask = await runTaskFnFactory(mockReportingCore, mockLogger);
      const jobParams = getScheduledTaskParams({
        headers: encryptedHeaders,
        fields: ['one', 'two'],
        conflictedTypesFields: [],
        searchRequest: { index: null, body: null },
      });
      const { content } = await runTask('job123', jobParams, cancellationToken);

      expect(content).toEqual("one,two\n\"'=cmd|' /C calc'!A0\",bar\n");
    });

    it('does not escapes values with formulas', async () => {
      configGetStub.withArgs('csv', 'escapeFormulaValues').returns(false);
      callAsCurrentUserStub.onFirstCall().returns({
        hits: {
          hits: [{ _source: { one: `=cmd|' /C calc'!A0`, two: 'bar' } }],
        },
        _scroll_id: 'scrollId',
      });

      const runTask = await runTaskFnFactory(mockReportingCore, mockLogger);
      const jobParams = getScheduledTaskParams({
        headers: encryptedHeaders,
        fields: ['one', 'two'],
        conflictedTypesFields: [],
        searchRequest: { index: null, body: null },
      });
      const { content } = await runTask('job123', jobParams, cancellationToken);

      expect(content).toEqual('one,two\n"=cmd|\' /C calc\'!A0",bar\n');
    });
  });

  describe('Elasticsearch call errors', function () {
    it('should reject Promise if search call errors out', async function () {
      callAsCurrentUserStub.rejects(new Error());
      const runTask = await runTaskFnFactory(mockReportingCore, mockLogger);
      const jobParams = getScheduledTaskParams({
        headers: encryptedHeaders,
        fields: [],
        searchRequest: { index: null, body: null },
      });
      await expect(runTask('job123', jobParams, cancellationToken)).rejects.toMatchInlineSnapshot(
        `[Error]`
      );
    });

    it('should reject Promise if scroll call errors out', async function () {
      callAsCurrentUserStub.onFirstCall().resolves({
        hits: {
          hits: [{}],
        },
        _scroll_id: 'scrollId',
      });
      callAsCurrentUserStub.onSecondCall().rejects(new Error());
      const runTask = await runTaskFnFactory(mockReportingCore, mockLogger);
      const jobParams = getScheduledTaskParams({
        headers: encryptedHeaders,
        fields: [],
        searchRequest: { index: null, body: null },
      });
      await expect(runTask('job123', jobParams, cancellationToken)).rejects.toMatchInlineSnapshot(
        `[Error]`
      );
    });
  });

  describe('invalid responses', function () {
    it('should reject Promise if search returns hits but no _scroll_id', async function () {
      callAsCurrentUserStub.resolves({
        hits: {
          hits: [{}],
        },
        _scroll_id: undefined,
      });

      const runTask = await runTaskFnFactory(mockReportingCore, mockLogger);
      const jobParams = getScheduledTaskParams({
        headers: encryptedHeaders,
        fields: [],
        searchRequest: { index: null, body: null },
      });
      await expect(runTask('job123', jobParams, cancellationToken)).rejects.toMatchInlineSnapshot(
        `[Error: Expected _scroll_id in the following Elasticsearch response: {"hits":{"hits":[{}]}}]`
      );
    });

    it('should reject Promise if search returns no hits and no _scroll_id', async function () {
      callAsCurrentUserStub.resolves({
        hits: {
          hits: [],
        },
        _scroll_id: undefined,
      });

      const runTask = await runTaskFnFactory(mockReportingCore, mockLogger);
      const jobParams = getScheduledTaskParams({
        headers: encryptedHeaders,
        fields: [],
        searchRequest: { index: null, body: null },
      });
      await expect(runTask('job123', jobParams, cancellationToken)).rejects.toMatchInlineSnapshot(
        `[Error: Expected _scroll_id in the following Elasticsearch response: {"hits":{"hits":[]}}]`
      );
    });

    it('should reject Promise if scroll returns hits but no _scroll_id', async function () {
      callAsCurrentUserStub.onFirstCall().resolves({
        hits: {
          hits: [{}],
        },
        _scroll_id: 'scrollId',
      });

      callAsCurrentUserStub.onSecondCall().resolves({
        hits: {
          hits: [{}],
        },
        _scroll_id: undefined,
      });

      const runTask = await runTaskFnFactory(mockReportingCore, mockLogger);
      const jobParams = getScheduledTaskParams({
        headers: encryptedHeaders,
        fields: [],
        searchRequest: { index: null, body: null },
      });
      await expect(runTask('job123', jobParams, cancellationToken)).rejects.toMatchInlineSnapshot(
        `[Error: Expected _scroll_id in the following Elasticsearch response: {"hits":{"hits":[{}]}}]`
      );
    });

    it('should reject Promise if scroll returns no hits and no _scroll_id', async function () {
      callAsCurrentUserStub.onFirstCall().resolves({
        hits: {
          hits: [{}],
        },
        _scroll_id: 'scrollId',
      });

      callAsCurrentUserStub.onSecondCall().resolves({
        hits: {
          hits: [],
        },
        _scroll_id: undefined,
      });

      const runTask = await runTaskFnFactory(mockReportingCore, mockLogger);
      const jobParams = getScheduledTaskParams({
        headers: encryptedHeaders,
        fields: [],
        searchRequest: { index: null, body: null },
      });
      await expect(runTask('job123', jobParams, cancellationToken)).rejects.toMatchInlineSnapshot(
        `[Error: Expected _scroll_id in the following Elasticsearch response: {"hits":{"hits":[]}}]`
      );
    });
  });

  describe('cancellation', function () {
    const scrollId = getRandomScrollId();

    beforeEach(function () {
      // We have to "re-stub" the callAsCurrentUser stub here so that we can use the fakeFunction
      // that delays the Promise resolution so we have a chance to call cancellationToken.cancel().
      // Otherwise, we get into an endless loop, and don't have a chance to call cancel
      callAsCurrentUserStub.restore();
      callAsCurrentUserStub = sinon
        .stub(clusterStub, 'callAsCurrentUser')
        .callsFake(async function () {
          await delay(1);
          return {
            hits: {
              hits: [{}],
            },
            _scroll_id: scrollId,
          };
        });
    });

    it('should stop calling Elasticsearch when cancellationToken.cancel is called', async function () {
      const runTask = await runTaskFnFactory(mockReportingCore, mockLogger);
      runTask(
        'job345',
        getScheduledTaskParams({
          headers: encryptedHeaders,
          fields: [],
          searchRequest: { index: null, body: null },
        }),
        cancellationToken
      );

      await delay(250);
      const callCount = callAsCurrentUserStub.callCount;
      cancellationToken.cancel();
      await delay(250);
      expect(callAsCurrentUserStub.callCount).toBe(callCount + 1); // last call is to clear the scroll
    });

    it(`shouldn't call clearScroll if it never got a scrollId`, async function () {
      const runTask = await runTaskFnFactory(mockReportingCore, mockLogger);
      runTask(
        'job345',
        getScheduledTaskParams({
          headers: encryptedHeaders,
          fields: [],
          searchRequest: { index: null, body: null },
        }),
        cancellationToken
      );
      cancellationToken.cancel();

      for (let i = 0; i < callAsCurrentUserStub.callCount; ++i) {
        expect(callAsCurrentUserStub.getCall(i).args[1]).not.toBe('clearScroll'); // dead code?
      }
    });

    it('should call clearScroll if it got a scrollId', async function () {
      const runTask = await runTaskFnFactory(mockReportingCore, mockLogger);
      runTask(
        'job345',
        getScheduledTaskParams({
          headers: encryptedHeaders,
          fields: [],
          searchRequest: { index: null, body: null },
        }),
        cancellationToken
      );
      await delay(100);
      cancellationToken.cancel();
      await delay(100);

      const lastCall = callAsCurrentUserStub.getCall(callAsCurrentUserStub.callCount - 1);
      expect(lastCall.args[0]).toBe('clearScroll');
      expect(lastCall.args[1].scrollId).toEqual([scrollId]);
    });
  });

  describe('csv content', function () {
    it('should write column headers to output, even if there are no results', async function () {
      const runTask = await runTaskFnFactory(mockReportingCore, mockLogger);
      const jobParams = getScheduledTaskParams({
        headers: encryptedHeaders,
        fields: ['one', 'two'],
        searchRequest: { index: null, body: null },
      });
      const { content } = await runTask('job123', jobParams, cancellationToken);
      expect(content).toBe(`one,two\n`);
    });

    it('should use custom uiSettings csv:separator for header', async function () {
      mockUiSettingsClient.get.withArgs(CSV_SEPARATOR_SETTING).returns(';');
      const runTask = await runTaskFnFactory(mockReportingCore, mockLogger);
      const jobParams = getScheduledTaskParams({
        headers: encryptedHeaders,
        fields: ['one', 'two'],
        searchRequest: { index: null, body: null },
      });
      const { content } = await runTask('job123', jobParams, cancellationToken);
      expect(content).toBe(`one;two\n`);
    });

    it('should escape column headers if uiSettings csv:quoteValues is true', async function () {
      mockUiSettingsClient.get.withArgs(CSV_QUOTE_VALUES_SETTING).returns(true);
      const runTask = await runTaskFnFactory(mockReportingCore, mockLogger);
      const jobParams = getScheduledTaskParams({
        headers: encryptedHeaders,
        fields: ['one and a half', 'two', 'three-and-four', 'five & six'],
        searchRequest: { index: null, body: null },
      });
      const { content } = await runTask('job123', jobParams, cancellationToken);
      expect(content).toBe(`"one and a half",two,"three-and-four","five & six"\n`);
    });

    it(`shouldn't escape column headers if uiSettings csv:quoteValues is false`, async function () {
      mockUiSettingsClient.get.withArgs(CSV_QUOTE_VALUES_SETTING).returns(false);
      const runTask = await runTaskFnFactory(mockReportingCore, mockLogger);
      const jobParams = getScheduledTaskParams({
        headers: encryptedHeaders,
        fields: ['one and a half', 'two', 'three-and-four', 'five & six'],
        searchRequest: { index: null, body: null },
      });
      const { content } = await runTask('job123', jobParams, cancellationToken);
      expect(content).toBe(`one and a half,two,three-and-four,five & six\n`);
    });

    it('should write column headers to output, when there are results', async function () {
      const runTask = await runTaskFnFactory(mockReportingCore, mockLogger);
      callAsCurrentUserStub.onFirstCall().resolves({
        hits: {
          hits: [{ one: '1', two: '2' }],
        },
        _scroll_id: 'scrollId',
      });

      const jobParams = getScheduledTaskParams({
        headers: encryptedHeaders,
        fields: ['one', 'two'],
        searchRequest: { index: null, body: null },
      });
      const { content } = await runTask('job123', jobParams, cancellationToken);
      const lines = content.split('\n');
      const headerLine = lines[0];
      expect(headerLine).toBe('one,two');
    });

    it('should use comma separated values of non-nested fields from _source', async function () {
      const runTask = await runTaskFnFactory(mockReportingCore, mockLogger);
      callAsCurrentUserStub.onFirstCall().resolves({
        hits: {
          hits: [{ _source: { one: 'foo', two: 'bar' } }],
        },
        _scroll_id: 'scrollId',
      });

      const jobParams = getScheduledTaskParams({
        headers: encryptedHeaders,
        fields: ['one', 'two'],
        conflictedTypesFields: [],
        searchRequest: { index: null, body: null },
      });
      const { content } = await runTask('job123', jobParams, cancellationToken);
      const lines = content.split('\n');
      const valuesLine = lines[1];
      expect(valuesLine).toBe('foo,bar');
    });

    it('should concatenate the hits from multiple responses', async function () {
      const runTask = await runTaskFnFactory(mockReportingCore, mockLogger);
      callAsCurrentUserStub.onFirstCall().resolves({
        hits: {
          hits: [{ _source: { one: 'foo', two: 'bar' } }],
        },
        _scroll_id: 'scrollId',
      });
      callAsCurrentUserStub.onSecondCall().resolves({
        hits: {
          hits: [{ _source: { one: 'baz', two: 'qux' } }],
        },
        _scroll_id: 'scrollId',
      });

      const jobParams = getScheduledTaskParams({
        headers: encryptedHeaders,
        fields: ['one', 'two'],
        conflictedTypesFields: [],
        searchRequest: { index: null, body: null },
      });
      const { content } = await runTask('job123', jobParams, cancellationToken);
      const lines = content.split('\n');

      expect(lines[1]).toBe('foo,bar');
      expect(lines[2]).toBe('baz,qux');
    });

    it('should use field formatters to format fields', async function () {
      const runTask = await runTaskFnFactory(mockReportingCore, mockLogger);
      callAsCurrentUserStub.onFirstCall().resolves({
        hits: {
          hits: [{ _source: { one: 'foo', two: 'bar' } }],
        },
        _scroll_id: 'scrollId',
      });

      const jobParams = getScheduledTaskParams({
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
      const { content } = await runTask('job123', jobParams, cancellationToken);
      const lines = content.split('\n');

      expect(lines[1]).toBe('FOO,bar');
    });
  });

  describe('maxSizeBytes', function () {
    // The following tests use explicitly specified lengths. UTF-8 uses between one and four 8-bit bytes for each
    // code-point. However, any character that can be represented by ASCII requires one-byte, so a majority of the
    // tests use these 'simple' characters to make the math easier

    describe('when only the headers exceed the maxSizeBytes', function () {
      let content: string;
      let maxSizeReached: boolean;

      beforeEach(async function () {
        configGetStub.withArgs('csv', 'maxSizeBytes').returns(1);

        const runTask = await runTaskFnFactory(mockReportingCore, mockLogger);
        const jobParams = getScheduledTaskParams({
          headers: encryptedHeaders,
          fields: ['one', 'two'],
          searchRequest: { index: null, body: null },
        });

        ({ content, max_size_reached: maxSizeReached } = await runTask(
          'job123',
          jobParams,
          cancellationToken
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
      let content: string;
      let maxSizeReached: boolean;

      beforeEach(async function () {
        configGetStub.withArgs('csv', 'maxSizeBytes').returns(9);

        const runTask = await runTaskFnFactory(mockReportingCore, mockLogger);
        const jobParams = getScheduledTaskParams({
          headers: encryptedHeaders,
          fields: ['one', 'two'],
          searchRequest: { index: null, body: null },
        });

        ({ content, max_size_reached: maxSizeReached } = await runTask(
          'job123',
          jobParams,
          cancellationToken
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
      let content: string;
      let maxSizeReached: boolean;

      beforeEach(async function () {
        configGetStub.withArgs('csv', 'maxSizeBytes').returns(9);

        callAsCurrentUserStub.onFirstCall().returns({
          hits: {
            hits: [{ _source: { one: 'foo', two: 'bar' } }],
          },
          _scroll_id: 'scrollId',
        });

        const runTask = await runTaskFnFactory(mockReportingCore, mockLogger);
        const jobParams = getScheduledTaskParams({
          headers: encryptedHeaders,
          fields: ['one', 'two'],
          conflictedTypesFields: [],
          searchRequest: { index: null, body: null },
        });

        ({ content, max_size_reached: maxSizeReached } = await runTask(
          'job123',
          jobParams,
          cancellationToken
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
      let content: string;
      let maxSizeReached: boolean;

      beforeEach(async function () {
        mockReportingCore.getUiSettingsServiceFactory = () =>
          Promise.resolve((mockUiSettingsClient as unknown) as IUiSettingsClient);
        configGetStub.withArgs('csv', 'maxSizeBytes').returns(18);

        callAsCurrentUserStub.onFirstCall().returns({
          hits: {
            hits: [{ _source: { one: 'foo', two: 'bar' } }],
          },
          _scroll_id: 'scrollId',
        });

        const runTask = await runTaskFnFactory(mockReportingCore, mockLogger);
        const jobParams = getScheduledTaskParams({
          headers: encryptedHeaders,
          fields: ['one', 'two'],
          conflictedTypesFields: [],
          searchRequest: { index: null, body: null },
        });

        ({ content, max_size_reached: maxSizeReached } = await runTask(
          'job123',
          jobParams,
          cancellationToken
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

      callAsCurrentUserStub.onFirstCall().returns({
        hits: {
          hits: [{}],
        },
        _scroll_id: 'scrollId',
      });

      const runTask = await runTaskFnFactory(mockReportingCore, mockLogger);
      const jobParams = getScheduledTaskParams({
        headers: encryptedHeaders,
        fields: ['one', 'two'],
        conflictedTypesFields: [],
        searchRequest: { index: null, body: null },
      });

      await runTask('job123', jobParams, cancellationToken);

      const searchCall = callAsCurrentUserStub.firstCall;
      expect(searchCall.args[0]).toBe('search');
      expect(searchCall.args[1].scroll).toBe(scrollDuration);
    });

    it('passes scroll size to initial search call', async function () {
      const scrollSize = 100;
      configGetStub.withArgs('csv', 'scroll').returns({ size: scrollSize });

      callAsCurrentUserStub.onFirstCall().resolves({
        hits: {
          hits: [{}],
        },
        _scroll_id: 'scrollId',
      });

      const runTask = await runTaskFnFactory(mockReportingCore, mockLogger);
      const jobParams = getScheduledTaskParams({
        headers: encryptedHeaders,
        fields: ['one', 'two'],
        conflictedTypesFields: [],
        searchRequest: { index: null, body: null },
      });

      await runTask('job123', jobParams, cancellationToken);

      const searchCall = callAsCurrentUserStub.firstCall;
      expect(searchCall.args[0]).toBe('search');
      expect(searchCall.args[1].size).toBe(scrollSize);
    });

    it('passes scroll duration to subsequent scroll call', async function () {
      const scrollDuration = 'test';
      configGetStub.withArgs('csv', 'scroll').returns({ duration: scrollDuration });

      callAsCurrentUserStub.onFirstCall().resolves({
        hits: {
          hits: [{}],
        },
        _scroll_id: 'scrollId',
      });

      const runTask = await runTaskFnFactory(mockReportingCore, mockLogger);
      const jobParams = getScheduledTaskParams({
        headers: encryptedHeaders,
        fields: ['one', 'two'],
        conflictedTypesFields: [],
        searchRequest: { index: null, body: null },
      });

      await runTask('job123', jobParams, cancellationToken);

      const scrollCall = callAsCurrentUserStub.secondCall;
      expect(scrollCall.args[0]).toBe('scroll');
      expect(scrollCall.args[1].scroll).toBe(scrollDuration);
    });
  });
});
