/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { GET_INDEX_RESULTS_LATEST } from '../../../common/constants';

import { serverMock } from '../../__mocks__/server';
import { requestMock } from '../../__mocks__/request';
import { requestContextMock } from '../../__mocks__/request_context';
import type { LatestAggResponseBucket } from './get_index_results_latest';
import { getIndexResultsLatestRoute, getQuery } from './get_index_results_latest';
import { loggerMock, type MockedLogger } from '@kbn/logging-mocks';
import { resultDocument } from './results.mock';
import type { SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import type { ResultDocument } from '../../schemas/result';
import type { CheckIndicesPrivilegesParam } from './privileges';
import { getRangeFilteredIndices } from '../../helpers/get_range_filtered_indices';

const mockCheckIndicesPrivileges = jest.fn(({ indices }: CheckIndicesPrivilegesParam) =>
  Promise.resolve(Object.fromEntries(indices.map((index) => [index, true])))
);
jest.mock('./privileges', () => ({
  checkIndicesPrivileges: (params: CheckIndicesPrivilegesParam) =>
    mockCheckIndicesPrivileges(params),
}));

jest.mock('../../helpers/get_range_filtered_indices', () => ({
  getRangeFilteredIndices: jest.fn(),
}));

const mockGetRangeFilteredIndices = getRangeFilteredIndices as jest.Mock;

const startDate = 'now-7d';
const endDate = 'now';

const searchResponse = {
  aggregations: {
    latest: {
      buckets: [
        {
          key: resultDocument.indexName,
          latest_doc: { hits: { hits: [{ _source: resultDocument }] } },
        },
      ],
    },
  },
} as unknown as SearchResponse<
  ResultDocument,
  Record<string, { buckets: LatestAggResponseBucket[] }>
>;

describe('getIndexResultsLatestRoute route', () => {
  describe('querying', () => {
    let server: ReturnType<typeof serverMock.create>;
    let { context } = requestContextMock.createTools();
    let logger: MockedLogger;

    const req = requestMock.create({
      method: 'get',
      path: GET_INDEX_RESULTS_LATEST,
      params: { pattern: 'logs-*' },
    });

    beforeEach(() => {
      jest.clearAllMocks();

      server = serverMock.create();
      logger = loggerMock.create();

      ({ context } = requestContextMock.createTools());

      context.core.elasticsearch.client.asInternalUser.indices.get.mockResolvedValue({
        [resultDocument.indexName]: {},
      });

      getIndexResultsLatestRoute(server.router, logger);
    });

    it('gets result without startDate and endDate', async () => {
      const mockSearch = context.core.elasticsearch.client.asInternalUser.search;
      mockSearch.mockResolvedValueOnce(searchResponse);

      const response = await server.inject(req, requestContextMock.convertContext(context));
      expect(mockSearch).toHaveBeenCalledWith({
        index: expect.any(String),
        ...getQuery([resultDocument.indexName]),
      });

      expect(response.status).toEqual(200);
      expect(response.body).toEqual([resultDocument]);

      expect(mockGetRangeFilteredIndices).not.toHaveBeenCalled();
    });

    it('gets result with startDate and endDate', async () => {
      const reqWithDate = requestMock.create({
        method: 'get',
        path: GET_INDEX_RESULTS_LATEST,
        params: { pattern: 'logs-*' },
        query: { startDate, endDate },
      });

      const filteredIndices = ['filtered-index-1', 'filtered-index-2'];
      mockGetRangeFilteredIndices.mockResolvedValueOnce(filteredIndices);
      const mockSearch = context.core.elasticsearch.client.asInternalUser.search;
      mockSearch.mockResolvedValueOnce(searchResponse);

      const response = await server.inject(reqWithDate, requestContextMock.convertContext(context));

      expect(mockGetRangeFilteredIndices).toHaveBeenCalledWith({
        client: context.core.elasticsearch.client,
        authorizedIndexNames: [resultDocument.indexName],
        startDate,
        endDate,
        logger,
        pattern: 'logs-*',
      });

      expect(mockSearch).toHaveBeenCalledWith({
        index: expect.any(String),
        ...getQuery(filteredIndices),
      });

      expect(response.status).toEqual(200);
      expect(response.body).toEqual([resultDocument]);
    });

    it('handles getRangeFilteredIndices error', async () => {
      const errorMessage = 'Range Filter Error';

      const reqWithDate = requestMock.create({
        method: 'get',
        path: GET_INDEX_RESULTS_LATEST,
        params: { pattern: 'logs-*' },
        query: { startDate, endDate },
      });

      mockGetRangeFilteredIndices.mockRejectedValueOnce(new Error(errorMessage));

      const response = await server.inject(reqWithDate, requestContextMock.convertContext(context));

      expect(mockGetRangeFilteredIndices).toHaveBeenCalledWith({
        client: context.core.elasticsearch.client,
        authorizedIndexNames: [resultDocument.indexName],
        startDate,
        endDate,
        logger,
        pattern: 'logs-*',
      });

      expect(response.status).toEqual(500);
      expect(response.body).toEqual({ message: errorMessage, status_code: 500 });
      expect(logger.error).toHaveBeenCalledWith(errorMessage);
    });

    it('gets result with startDate and endDate and multiple filtered indices', async () => {
      const filteredIndices = ['filtered-index-1', 'filtered-index-2', 'filtered-index-3'];
      const filteredIndicesSearchResponse = {
        aggregations: {
          latest: {
            buckets: filteredIndices.map((indexName) => ({
              key: indexName,
              latest_doc: { hits: { hits: [{ _source: { indexName } }] } },
            })),
          },
        },
      } as unknown as SearchResponse<
        ResultDocument,
        Record<string, { buckets: LatestAggResponseBucket[] }>
      >;

      const reqWithDate = requestMock.create({
        method: 'get',
        path: GET_INDEX_RESULTS_LATEST,
        params: { pattern: 'logs-*' },
        query: { startDate, endDate },
      });

      mockGetRangeFilteredIndices.mockResolvedValueOnce(filteredIndices);
      context.core.elasticsearch.client.asInternalUser.search.mockResolvedValueOnce(
        filteredIndicesSearchResponse
      );

      const response = await server.inject(reqWithDate, requestContextMock.convertContext(context));

      expect(mockGetRangeFilteredIndices).toHaveBeenCalledWith({
        client: context.core.elasticsearch.client,
        authorizedIndexNames: [resultDocument.indexName],
        startDate,
        endDate,
        logger,
        pattern: 'logs-*',
      });

      expect(context.core.elasticsearch.client.asInternalUser.search).toHaveBeenCalledWith({
        index: expect.any(String),
        ...getQuery(filteredIndices),
      });

      const expectedResults = filteredIndices.map((indexName) => ({
        indexName,
      })) as ResultDocument[];
      expect(response.status).toEqual(200);
      expect(response.body).toEqual(expectedResults);
    });

    it('handles partial authorization when using startDate and endDate', async () => {
      const authorizationResult = {
        'filtered-index-1': true,
        'filtered-index-2': false,
      };

      mockGetRangeFilteredIndices.mockResolvedValueOnce(['filtered-index-1']);
      mockCheckIndicesPrivileges.mockResolvedValueOnce(authorizationResult);

      const mockSearch = context.core.elasticsearch.client.asInternalUser.search;
      mockSearch.mockResolvedValueOnce(searchResponse);

      const reqWithDate = requestMock.create({
        method: 'get',
        path: GET_INDEX_RESULTS_LATEST,
        params: { pattern: 'logs-*' },
        query: { startDate, endDate },
      });

      const response = await server.inject(reqWithDate, requestContextMock.convertContext(context));

      expect(mockGetRangeFilteredIndices).toHaveBeenCalledWith({
        client: context.core.elasticsearch.client,
        authorizedIndexNames: ['filtered-index-1'],
        startDate,
        endDate,
        logger,
        pattern: 'logs-*',
      });

      expect(context.core.elasticsearch.client.asInternalUser.search).toHaveBeenCalledWith({
        index: expect.any(String),
        ...getQuery(['filtered-index-1']),
      });

      expect(response.status).toEqual(200);
      expect(response.body).toEqual([resultDocument]);
    });

    it('handles results data stream error', async () => {
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

    it('handles error', async () => {
      const errorMessage = 'Error!';
      const mockSearch = context.core.elasticsearch.client.asInternalUser.search;
      mockSearch.mockRejectedValueOnce({ message: errorMessage });

      const response = await server.inject(req, requestContextMock.convertContext(context));
      expect(response.status).toEqual(500);
      expect(response.body).toEqual({ message: errorMessage, status_code: 500 });
    });
  });

  describe('request indices authorization', () => {
    let server: ReturnType<typeof serverMock.create>;
    let { context } = requestContextMock.createTools();
    let logger: MockedLogger;

    const req = requestMock.create({
      method: 'get',
      path: GET_INDEX_RESULTS_LATEST,
      params: { pattern: 'logs-*' },
    });

    beforeEach(() => {
      jest.clearAllMocks();

      server = serverMock.create();
      logger = loggerMock.create();

      ({ context } = requestContextMock.createTools());

      context.core.elasticsearch.client.asInternalUser.search.mockResolvedValue(searchResponse);

      context.core.elasticsearch.client.asInternalUser.indices.get.mockResolvedValue({
        [resultDocument.indexName]: {},
      });

      getIndexResultsLatestRoute(server.router, logger);
    });

    it('should authorize indices from pattern', async () => {
      const mockGetIndices = context.core.elasticsearch.client.asInternalUser.indices.get;
      mockGetIndices.mockResolvedValueOnce({ [resultDocument.indexName]: {} });

      const response = await server.inject(req, requestContextMock.convertContext(context));
      expect(mockGetIndices).toHaveBeenCalledWith({ index: 'logs-*', features: 'aliases' });
      expect(mockCheckIndicesPrivileges).toHaveBeenCalledWith(
        expect.objectContaining({ indices: [resultDocument.indexName] })
      );
      expect(context.core.elasticsearch.client.asInternalUser.search).toHaveBeenCalled();

      expect(response.status).toEqual(200);
      expect(response.body).toEqual([resultDocument]);
    });

    it('should authorize data streams from pattern', async () => {
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
        ...getQuery([resultDocument.indexName, resultIndexNameTwo, resultIndexNameThree]),
      });

      expect(response.status).toEqual(200);
      expect(response.body).toEqual([resultDocument]);
    });

    it('should not search unknown indices', async () => {
      const mockGetIndices = context.core.elasticsearch.client.asInternalUser.indices.get;
      mockGetIndices.mockResolvedValueOnce({}); // empty object means no index is found

      const response = await server.inject(req, requestContextMock.convertContext(context));

      expect(mockCheckIndicesPrivileges).not.toHaveBeenCalled();
      expect(context.core.elasticsearch.client.asInternalUser.search).not.toHaveBeenCalled();

      expect(response.status).toEqual(200);
      expect(response.body).toEqual([]);
    });

    it('should not search unauthorized indices', async () => {
      mockCheckIndicesPrivileges.mockResolvedValueOnce({}); // empty object means no index is authorized

      const response = await server.inject(req, requestContextMock.convertContext(context));
      expect(context.core.elasticsearch.client.asInternalUser.search).not.toHaveBeenCalled();

      expect(response.status).toEqual(200);
      expect(response.body).toEqual([]);
    });

    it('handles index discovery error', async () => {
      const errorMessage = 'Error!';
      const mockGetIndices = context.core.elasticsearch.client.asInternalUser.indices.get;
      mockGetIndices.mockRejectedValueOnce({ message: errorMessage });

      const response = await server.inject(req, requestContextMock.convertContext(context));
      expect(response.status).toEqual(500);
      expect(response.body).toEqual({ message: errorMessage, status_code: 500 });
    });

    it('handles index authorization error', async () => {
      const errorMessage = 'Error!';
      mockCheckIndicesPrivileges.mockRejectedValueOnce({ message: errorMessage });

      const response = await server.inject(req, requestContextMock.convertContext(context));
      expect(response.status).toEqual(500);
      expect(response.body).toEqual({ message: errorMessage, status_code: 500 });
    });
  });

  describe('request validation', () => {
    let server: ReturnType<typeof serverMock.create>;
    let logger: MockedLogger;
    beforeEach(() => {
      server = serverMock.create();
      logger = loggerMock.create();
      getIndexResultsLatestRoute(server.router, logger);
    });

    test('disallows invalid path param', () => {
      const req = requestMock.create({
        method: 'get',
        path: GET_INDEX_RESULTS_LATEST,
        params: {},
      });
      const result = server.validate(req);

      expect(result.badRequest).toHaveBeenCalled();
    });
  });
});
