/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { setTimeout as setTimeoutPromise } from 'timers/promises';
import { contextServiceMock, executionContextServiceMock } from '@kbn/core/server/mocks';
import { createHttpService } from '@kbn/core-http-server-mocks';
import type { ElasticsearchClient, KibanaRequest } from '@kbn/core/server';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type {
  TermsEnumRequest,
  MsearchMultisearchBody,
} from '@elastic/elasticsearch/lib/api/types';
import supertest from 'supertest';
import { APMEventClient, type APMEventESSearchRequest, type APMEventFieldCapsRequest } from '.';
import { APMIndices } from '../../../..';

import * as cancelEsRequestOnAbortModule from '../cancel_es_request_on_abort';
import * as observabilityPluginModule from '@kbn/observability-plugin/server';

jest.mock('@kbn/observability-plugin/server', () => ({
  __esModule: true,
  ...jest.requireActual('@kbn/observability-plugin/server'),
}));

describe('APMEventClient', () => {
  describe('Abort controller', () => {
    let server: ReturnType<typeof createHttpService>;
    beforeEach(() => {
      server = createHttpService();
    });

    afterEach(async () => {
      await server.stop();
    });

    it('cancels a search when a request is aborted', async () => {
      await server.preboot({
        context: contextServiceMock.createPrebootContract(),
      });
      const { server: innerServer, createRouter } = await server.setup({
        context: contextServiceMock.createSetupContract(),
        executionContext: executionContextServiceMock.createInternalSetupContract(),
      });
      const router = createRouter('/');

      let abortSignal: AbortSignal | undefined;
      router.get({ path: '/', validate: false }, async (context, request, res) => {
        const eventClient = new APMEventClient({
          esClient: {
            search: async (params: any, { signal }: { signal: AbortSignal }) => {
              abortSignal = signal;
              await setTimeoutPromise(3_000, undefined, {
                signal: abortSignal,
              });
              return {};
            },
          } as any,
          debug: false,
          request,
          indices: {} as APMIndices,
          options: {
            includeFrozen: false,
          },
        });

        await eventClient.search('foo', {
          apm: {
            events: [],
          },
          body: { size: 0, track_total_hits: false },
        });

        return res.ok({ body: 'ok' });
      });

      await server.start();

      expect(abortSignal?.aborted).toBeFalsy();

      const incomingRequest = supertest(innerServer.listener)
        .get('/')
        // end required to send request
        .end();

      await new Promise((resolve) => {
        setTimeout(() => {
          void incomingRequest.on('abort', () => {
            setTimeout(() => {
              resolve(undefined);
            }, 100);
          });

          void incomingRequest.abort();
        }, 200);
      });

      expect(abortSignal?.aborted).toBe(true);
    });
  });

  describe('excludedDataTiers filter', () => {
    let esClientMock: jest.Mocked<ElasticsearchClient>;
    let apmEventClient: APMEventClient;
    let cancelEsRequestOnAbortSpy: jest.SpyInstance;
    let unwrapEsResponseSpy: jest.SpyInstance;

    const esResponse: estypes.SearchResponse = {
      hits: {
        total: { value: 1, relation: 'eq' },
        hits: [{ _source: {}, _index: '' }],
        max_score: 1,
      },
      took: 1,
      _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
      timed_out: false,
    };

    beforeAll(() => {
      jest.resetModules();
    });

    beforeEach(() => {
      cancelEsRequestOnAbortSpy = jest
        .spyOn(cancelEsRequestOnAbortModule, 'cancelEsRequestOnAbort')
        .mockImplementation(jest.fn());

      unwrapEsResponseSpy = jest
        .spyOn(observabilityPluginModule, 'unwrapEsResponse')
        .mockImplementation(jest.fn());

      esClientMock = {
        search: jest.fn(),
        msearch: jest.fn(),
        eql: { search: jest.fn() },
        fieldCaps: jest.fn(),
        termsEnum: jest.fn(),
      } as unknown as jest.Mocked<ElasticsearchClient>;

      apmEventClient = new APMEventClient({
        esClient: esClientMock,
        debug: false,
        request: {} as KibanaRequest,
        indices: {} as APMIndices,
        options: {
          includeFrozen: false,
          excludedDataTiers: ['data_warm', 'data_cold'],
        },
      });
    });

    afterAll(() => {
      cancelEsRequestOnAbortSpy.mockReset();
      unwrapEsResponseSpy.mockReset();
    });

    it('includes excludedDataTiers filter in search params', async () => {
      esClientMock.search.mockResolvedValue(esResponse);

      await apmEventClient.search('testOperation', {
        apm: { events: [] },
        body: {
          size: 0,
          track_total_hits: false,
          query: { bool: { filter: [{ match_all: {} }] } },
        },
      });

      const searchParams = esClientMock.search.mock.calls[0][0] as APMEventESSearchRequest;

      expect(searchParams.body.query?.bool).toEqual({
        filter: [
          { terms: { 'processor.event': [] } },
          { bool: { must_not: [{ terms: { _tier: ['data_warm', 'data_cold'] } }] } },
        ],
        must: [{ bool: { filter: [{ match_all: {} }] } }],
      });
    });

    it('includes excludedDataTiers filter in msearch params', async () => {
      esClientMock.msearch.mockResolvedValue({ responses: [esResponse], took: 1 });

      await apmEventClient.msearch('testOperation', {
        apm: { events: [] },
        body: {
          size: 0,
          track_total_hits: false,
          query: { bool: { filter: [{ match_all: {} }] } },
        },
      });

      const msearchParams = esClientMock.msearch.mock.calls[0][0] as {
        searches: MsearchMultisearchBody[];
      };

      expect(msearchParams.searches[1].query?.bool).toEqual({
        filter: [
          { bool: { filter: [{ match_all: {} }] } },
          { terms: { 'processor.event': [] } },
          { bool: { must_not: [{ terms: { _tier: ['data_warm', 'data_cold'] } }] } },
        ],
      });
    });

    it('includes excludedDataTiers filter in fieldCaps params', async () => {
      esClientMock.fieldCaps.mockResolvedValue({
        fields: {},
        indices: '',
      });

      await apmEventClient.fieldCaps('testOperation', {
        apm: { events: [] },
        fields: ['field1'],
        index_filter: { bool: { filter: [{ match_all: {} }] } },
      });

      const fieldCapsParams = esClientMock.fieldCaps.mock.calls[0][0] as APMEventFieldCapsRequest;
      expect(fieldCapsParams?.index_filter?.bool).toEqual({
        must: [
          { bool: { filter: [{ match_all: {} }] } },
          { bool: { must_not: [{ terms: { _tier: ['data_warm', 'data_cold'] } }] } },
        ],
      });
    });

    it('includes excludedDataTiers filter in termsEnum params', async () => {
      esClientMock.termsEnum.mockResolvedValue({
        terms: [''],
        _shards: { total: 1, successful: 1, failed: 0 },
        complete: true,
      });

      await apmEventClient.termsEnum('testOperation', {
        apm: { events: [] },
        field: 'field1',
        index_filter: { bool: { filter: [{ match_all: {} }] } },
      });

      const termsEnumParams = esClientMock.termsEnum.mock.calls[0][0] as TermsEnumRequest;

      expect(termsEnumParams.index_filter?.bool).toEqual({
        must: [
          { bool: { filter: [{ match_all: {} }] } },
          { bool: { must_not: [{ terms: { _tier: ['data_warm', 'data_cold'] } }] } },
        ],
      });
    });
  });
});
