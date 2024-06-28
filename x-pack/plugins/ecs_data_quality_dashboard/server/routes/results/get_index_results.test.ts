/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GET_INDEX_RESULTS } from '../../../common/constants';
import { serverMock } from '../../__mocks__/server';
import { requestMock } from '../../__mocks__/request';
import { requestContextMock } from '../../__mocks__/request_context';
import { loggerMock } from '@kbn/logging-mocks';
import { resultDocument } from './results.mock';

import type { SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import type { ResultDocument } from '../../schemas/result';
import type { CheckIndicesPrivilegesParam } from './privileges';
import { getIndexResultsRoute, getQuery } from './get_index_results';

const searchResponse = {
  hits: { total: { value: 1 }, hits: [{ _source: resultDocument }] },
} as unknown as SearchResponse<ResultDocument>;

const mockCheckIndicesPrivileges = jest.fn(({ indices }: CheckIndicesPrivilegesParam) =>
  Promise.resolve(Object.fromEntries(indices.map((index) => [index, true])))
);

jest.mock('./privileges', () => ({
  checkIndicesPrivileges: (params: CheckIndicesPrivilegesParam) =>
    mockCheckIndicesPrivileges(params),
}));

const createTestSetup = () => {
  const server = serverMock.create();
  const logger = loggerMock.create();
  const { context } = requestContextMock.createTools();

  context.core.elasticsearch.client.asInternalUser.indices.get.mockResolvedValue({
    [resultDocument.indexName]: {},
  });
  context.core.elasticsearch.client.asInternalUser.search.mockResolvedValue(searchResponse);
  getIndexResultsRoute(server.router, logger);

  return { server, context, logger };
};

describe('getIndexResultsRoute route', () => {
  beforeEach(() => jest.clearAllMocks());
  describe('when querying', () => {
    describe('when the request is successful', () => {
      it('returns the result with total', async () => {
        const { server, context } = createTestSetup();

        const req = requestMock.create({
          method: 'get',
          path: GET_INDEX_RESULTS,
          params: { pattern: 'logs-*' },
        });

        const mockSearch = context.core.elasticsearch.client.asInternalUser.search;
        mockSearch.mockResolvedValueOnce(searchResponse);
        const response = await server.inject(req, requestContextMock.convertContext(context));

        expect(mockSearch).toHaveBeenCalledWith({
          index: expect.any(String),
          ...getQuery({ indexNames: [resultDocument.indexName] }),
        });

        expect(response.status).toEqual(200);
        expect(response.body).toEqual({ data: [resultDocument], total: 1 });
      });
    });

    describe('when there is a results data stream error', () => {
      it('returns a 503 error', async () => {
        const { server, context, logger } = createTestSetup();

        const req = requestMock.create({
          method: 'get',
          path: GET_INDEX_RESULTS,
          params: { pattern: 'logs-*' },
        });

        const errorMessage = 'Installation Error!';

        context.dataQualityDashboard.getResultsIndexName.mockRejectedValueOnce(
          new Error(errorMessage)
        );
        const response = await server.inject(req, requestContextMock.convertContext(context));

        expect(response.status).toEqual(503);
        expect(response.body).toEqual({
          message: expect.stringContaining(errorMessage),
          status_code: 503,
        });
        expect(logger.error).toHaveBeenCalledWith(expect.stringContaining(errorMessage));
      });
    });

    describe('when there is a search error', () => {
      it('returns a 500 error', async () => {
        const { server, context } = createTestSetup();

        const req = requestMock.create({
          method: 'get',
          path: GET_INDEX_RESULTS,
          params: { pattern: 'logs-*' },
        });

        const errorMessage = 'Error!';
        const mockSearch = context.core.elasticsearch.client.asInternalUser.search;
        mockSearch.mockRejectedValueOnce({ message: errorMessage });
        const response = await server.inject(req, requestContextMock.convertContext(context));

        expect(response.status).toEqual(500);
        expect(response.body).toEqual({ message: errorMessage, status_code: 500 });
      });
    });

    describe('given a "from" parameter', () => {
      it('calls search with "from" option', async () => {
        const { server, context } = createTestSetup();

        const req = requestMock.create({
          method: 'get',
          path: GET_INDEX_RESULTS,
          params: { pattern: 'logs-*' },
          query: { from: '10' },
        });

        const mockSearch = context.core.elasticsearch.client.asInternalUser.search;
        mockSearch.mockResolvedValueOnce(searchResponse);
        await server.inject(req, requestContextMock.convertContext(context));

        expect(mockSearch).toHaveBeenCalledWith({
          from: 10,
          index: expect.any(String),
          query: {
            bool: {
              filter: [
                {
                  terms: {
                    indexName: [resultDocument.indexName],
                  },
                },
              ],
            },
          },
          sort: [{ '@timestamp': 'desc' }],
        });
      });
    });

    describe('given a "size" parameter', () => {
      it('calls search with "size" option', async () => {
        const { server, context } = createTestSetup();

        const req = requestMock.create({
          method: 'get',
          path: GET_INDEX_RESULTS,
          params: { pattern: 'logs-*' },
          query: { size: '5' },
        });

        const mockSearch = context.core.elasticsearch.client.asInternalUser.search;
        mockSearch.mockResolvedValueOnce(searchResponse);
        await server.inject(req, requestContextMock.convertContext(context));

        expect(mockSearch).toHaveBeenCalledWith({
          index: expect.any(String),
          size: 5,
          query: {
            bool: {
              filter: [
                {
                  terms: {
                    indexName: [resultDocument.indexName],
                  },
                },
              ],
            },
          },
          sort: [{ '@timestamp': 'desc' }],
        });
      });
    });

    describe('given an "outcome=pass" parameter', () => {
      it('calls search with "incompatibleFieldCount < 1" range option', async () => {
        const { server, context } = createTestSetup();

        const req = requestMock.create({
          method: 'get',
          path: GET_INDEX_RESULTS,
          params: { pattern: 'logs-*' },
          query: { outcome: 'pass' },
        });

        const mockSearch = context.core.elasticsearch.client.asInternalUser.search;
        mockSearch.mockResolvedValueOnce(searchResponse);
        await server.inject(req, requestContextMock.convertContext(context));

        expect(mockSearch).toHaveBeenCalledWith({
          index: expect.any(String),
          query: {
            bool: {
              filter: [
                {
                  terms: {
                    indexName: [resultDocument.indexName],
                  },
                },
                {
                  range: {
                    incompatibleFieldCount: { lt: 1 },
                  },
                },
              ],
            },
          },
          sort: [{ '@timestamp': 'desc' }],
        });
      });
    });

    describe('given an "outcome=fail" parameter', () => {
      it('calls search with "incompatibleFieldCount > 0" range option', async () => {
        const { server, context } = createTestSetup();

        const req = requestMock.create({
          method: 'get',
          path: GET_INDEX_RESULTS,
          params: { pattern: 'logs-*' },
          query: { outcome: 'fail' },
        });

        const mockSearch = context.core.elasticsearch.client.asInternalUser.search;
        mockSearch.mockResolvedValueOnce(searchResponse);
        await server.inject(req, requestContextMock.convertContext(context));

        expect(mockSearch).toHaveBeenCalledWith({
          index: expect.any(String),
          query: {
            bool: {
              filter: [
                {
                  terms: {
                    indexName: [resultDocument.indexName],
                  },
                },
                {
                  range: {
                    incompatibleFieldCount: { gt: 0 },
                  },
                },
              ],
            },
          },
          sort: [{ '@timestamp': 'desc' }],
        });
      });
    });

    describe('given a "startDate" parameter', () => {
      it('calls search with "@timestamp >= starDate" range option', async () => {
        const { server, context } = createTestSetup();

        const req = requestMock.create({
          method: 'get',
          path: GET_INDEX_RESULTS,
          params: { pattern: 'logs-*' },
          query: { startDate: '2023-01-01T00:00:00Z' },
        });

        const mockSearch = context.core.elasticsearch.client.asInternalUser.search;
        mockSearch.mockResolvedValueOnce(searchResponse);
        await server.inject(req, requestContextMock.convertContext(context));

        expect(mockSearch).toHaveBeenCalledWith({
          index: expect.any(String),

          query: {
            bool: {
              filter: [
                {
                  terms: {
                    indexName: [resultDocument.indexName],
                  },
                },
                {
                  range: {
                    '@timestamp': {
                      gte: '2023-01-01T00:00:00Z',
                    },
                  },
                },
              ],
            },
          },
          sort: [{ '@timestamp': 'desc' }],
        });
      });
    });

    describe('given an "endDate" parameter', () => {
      it('calls search with "@timestamp <= endDate" range option', async () => {
        const { server, context } = createTestSetup();

        const req = requestMock.create({
          method: 'get',
          path: GET_INDEX_RESULTS,
          params: { pattern: 'logs-*' },
          query: { endDate: '2023-12-31T23:59:59Z' },
        });

        const mockSearch = context.core.elasticsearch.client.asInternalUser.search;
        mockSearch.mockResolvedValueOnce(searchResponse);
        await server.inject(req, requestContextMock.convertContext(context));

        expect(mockSearch).toHaveBeenCalledWith({
          index: expect.any(String),
          query: {
            bool: {
              filter: [
                {
                  terms: {
                    indexName: [resultDocument.indexName],
                  },
                },
                {
                  range: {
                    '@timestamp': {
                      lte: '2023-12-31T23:59:59Z',
                    },
                  },
                },
              ],
            },
          },
          sort: [{ '@timestamp': 'desc' }],
        });
      });
    });

    describe('given both "startDate" and "endDate" parameters', () => {
      it('calls search with "@timestamp >= startDate && <= endDate" range option', async () => {
        const { server, context } = createTestSetup();

        const req = requestMock.create({
          method: 'get',
          path: GET_INDEX_RESULTS,
          params: { pattern: 'logs-*' },
          query: { startDate: '2023-01-01T00:00:00Z', endDate: '2023-12-31T23:59:59Z' },
        });

        const mockSearch = context.core.elasticsearch.client.asInternalUser.search;
        mockSearch.mockResolvedValueOnce(searchResponse);
        await server.inject(req, requestContextMock.convertContext(context));

        expect(mockSearch).toHaveBeenCalledWith({
          index: expect.any(String),

          query: {
            bool: {
              filter: [
                {
                  terms: {
                    indexName: [resultDocument.indexName],
                  },
                },
                {
                  range: {
                    '@timestamp': {
                      gte: '2023-01-01T00:00:00Z',
                      lte: '2023-12-31T23:59:59Z',
                    },
                  },
                },
              ],
            },
          },
          sort: [{ '@timestamp': 'desc' }],
        });
      });
    });
  });

  describe('when requesting indices authorization', () => {
    describe('when indices are authorized from pattern', () => {
      it('returns the result', async () => {
        const { server, context } = createTestSetup();

        const req = requestMock.create({
          method: 'get',
          path: GET_INDEX_RESULTS,
          params: { pattern: 'logs-*' },
        });

        const mockGetIndices = context.core.elasticsearch.client.asInternalUser.indices.get;
        mockGetIndices.mockResolvedValueOnce({ [resultDocument.indexName]: {} });
        const response = await server.inject(req, requestContextMock.convertContext(context));
        expect(mockGetIndices).toHaveBeenCalledWith({ index: 'logs-*', features: 'aliases' });
        expect(mockCheckIndicesPrivileges).toHaveBeenCalledWith(
          expect.objectContaining({ indices: [resultDocument.indexName] })
        );

        expect(context.core.elasticsearch.client.asInternalUser.search).toHaveBeenCalled();
        expect(response.status).toEqual(200);
        expect(response.body).toEqual({ data: [resultDocument], total: 1 });
      });
    });

    describe('when data streams are authorized from pattern', () => {
      it('returns the result', async () => {
        const { server, context } = createTestSetup();

        const req = requestMock.create({
          method: 'get',
          path: GET_INDEX_RESULTS,
          params: { pattern: 'logs-*' },
        });

        const dataStreamName = 'test_data_stream_name';
        const resultIndexNameTwo = `${resultDocument.indexName}_2`;
        const resultIndexNameThree = `${resultDocument.indexName}_3`;
        const mockGetIndices = context.core.elasticsearch.client.asInternalUser.indices.get;

        mockGetIndices.mockResolvedValueOnce({
          [resultDocument.indexName]: {},
          [resultIndexNameTwo]: { data_stream: dataStreamName },
          [resultIndexNameThree]: { data_stream: dataStreamName },
        });

        const response = await server.inject(req, requestContextMock.convertContext(context));

        expect(mockGetIndices).toHaveBeenCalledWith({ index: 'logs-*', features: 'aliases' });
        expect(mockCheckIndicesPrivileges).toHaveBeenCalledWith(
          expect.objectContaining({ indices: [resultDocument.indexName, dataStreamName] })
        );
        expect(context.core.elasticsearch.client.asInternalUser.search).toHaveBeenCalledWith({
          index: expect.any(String),
          ...getQuery({
            indexNames: [resultDocument.indexName, resultIndexNameTwo, resultIndexNameThree],
          }),
        });
        expect(response.status).toEqual(200);
        expect(response.body).toEqual({ data: [resultDocument], total: 1 });
      });
    });

    describe('when no indices are found', () => {
      it('does not search and returns an empty array', async () => {
        const { server, context } = createTestSetup();

        const req = requestMock.create({
          method: 'get',
          path: GET_INDEX_RESULTS,
          params: { pattern: 'logs-*' },
        });

        const mockGetIndices = context.core.elasticsearch.client.asInternalUser.indices.get;
        mockGetIndices.mockResolvedValueOnce({}); // empty object means no index is found
        const response = await server.inject(req, requestContextMock.convertContext(context));

        expect(mockCheckIndicesPrivileges).not.toHaveBeenCalled();
        expect(context.core.elasticsearch.client.asInternalUser.search).not.toHaveBeenCalled();
        expect(response.status).toEqual(200);
        expect(response.body).toEqual({ data: [], total: 0 });
      });
    });

    describe('when indices are unauthorized', () => {
      it('does not search and returns an empty array', async () => {
        const { server, context } = createTestSetup();

        const req = requestMock.create({
          method: 'get',
          path: GET_INDEX_RESULTS,
          params: { pattern: 'logs-*' },
        });

        mockCheckIndicesPrivileges.mockResolvedValueOnce({}); // empty object means no index is authorized
        const response = await server.inject(req, requestContextMock.convertContext(context));

        expect(context.core.elasticsearch.client.asInternalUser.search).not.toHaveBeenCalled();
        expect(response.status).toEqual(200);
        expect(response.body).toEqual({ data: [], total: 0 });
      });
    });

    describe('when there is an index discovery error', () => {
      it('returns a 500 error', async () => {
        const { server, context } = createTestSetup();

        const req = requestMock.create({
          method: 'get',
          path: GET_INDEX_RESULTS,
          params: { pattern: 'logs-*' },
        });

        const errorMessage = 'Error!';
        const mockGetIndices = context.core.elasticsearch.client.asInternalUser.indices.get;
        mockGetIndices.mockRejectedValueOnce({ message: errorMessage });
        const response = await server.inject(req, requestContextMock.convertContext(context));

        expect(response.status).toEqual(500);
        expect(response.body).toEqual({ message: errorMessage, status_code: 500 });
      });
    });

    describe('when there is an index authorization error', () => {
      it('returns a 500 error', async () => {
        const { server, context } = createTestSetup();

        const req = requestMock.create({
          method: 'get',
          path: GET_INDEX_RESULTS,
          params: { pattern: 'logs-*' },
        });

        const errorMessage = 'Error!';
        mockCheckIndicesPrivileges.mockRejectedValueOnce({ message: errorMessage });
        const response = await server.inject(req, requestContextMock.convertContext(context));

        expect(response.status).toEqual(500);
        expect(response.body).toEqual({ message: errorMessage, status_code: 500 });
      });
    });
  });

  describe('when validating request', () => {
    describe('when path param is invalid', () => {
      it('returns a bad request error', () => {
        const { server } = createTestSetup();

        const req = requestMock.create({
          method: 'get',
          path: GET_INDEX_RESULTS,
          params: {},
        });

        const result = server.validate(req);

        expect(result.badRequest).toHaveBeenCalled();
      });
    });
  });
});
