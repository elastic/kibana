/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { RESULTS_ROUTE_PATH } from '../../../common/constants';

import { serverMock } from '../../__mocks__/server';
import { requestMock } from '../../__mocks__/request';
import { requestContextMock } from '../../__mocks__/request_context';
import { postResultsRoute } from './post_results';
import { loggerMock, type MockedLogger } from '@kbn/logging-mocks';
import type { WriteResponseBase } from '@elastic/elasticsearch/lib/api/types';
import { resultDocument } from './results.mock';
import type { CheckIndicesPrivilegesParam } from './privileges';

const mockCheckIndicesPrivileges = jest.fn(({ indices }: CheckIndicesPrivilegesParam) =>
  Promise.resolve(Object.fromEntries(indices.map((index) => [index, true])))
);
jest.mock('./privileges', () => ({
  checkIndicesPrivileges: (params: CheckIndicesPrivilegesParam) =>
    mockCheckIndicesPrivileges(params),
}));

describe('postResultsRoute route', () => {
  describe('indexation', () => {
    let server: ReturnType<typeof serverMock.create>;
    let { context } = requestContextMock.createTools();
    let logger: MockedLogger;

    const req = requestMock.create({
      method: 'post',
      path: RESULTS_ROUTE_PATH,
      body: resultDocument,
    });

    beforeEach(() => {
      jest.clearAllMocks();

      server = serverMock.create();
      logger = loggerMock.create();

      ({ context } = requestContextMock.createTools());

      context.core.elasticsearch.client.asInternalUser.indices.get.mockResolvedValue({
        [resultDocument.indexName]: {},
      });
      postResultsRoute(server.router, logger);
    });

    it('indexes result', async () => {
      const mockIndex = context.core.elasticsearch.client.asInternalUser.index;
      mockIndex.mockResolvedValueOnce({ result: 'created' } as WriteResponseBase);

      const response = await server.inject(req, requestContextMock.convertContext(context));
      expect(mockIndex).toHaveBeenCalledWith({
        body: { ...resultDocument, '@timestamp': expect.any(Number) },
        index: await context.dataQualityDashboard.getResultsIndexName(),
      });

      expect(response.status).toEqual(200);
      expect(response.body).toEqual({ result: 'created' });
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

    it('handles index error', async () => {
      const errorMessage = 'Error!';
      const mockIndex = context.core.elasticsearch.client.asInternalUser.index;
      mockIndex.mockRejectedValueOnce({ message: errorMessage });

      const response = await server.inject(req, requestContextMock.convertContext(context));
      expect(response.status).toEqual(500);
      expect(response.body).toEqual({ message: errorMessage, status_code: 500 });
    });
  });

  describe('request index authorization', () => {
    let server: ReturnType<typeof serverMock.create>;
    let { context } = requestContextMock.createTools();
    let logger: MockedLogger;

    const req = requestMock.create({
      method: 'post',
      path: RESULTS_ROUTE_PATH,
      body: resultDocument,
    });

    beforeEach(() => {
      jest.clearAllMocks();

      server = serverMock.create();
      logger = loggerMock.create();

      ({ context } = requestContextMock.createTools());

      context.core.elasticsearch.client.asInternalUser.indices.get.mockResolvedValue({
        [resultDocument.indexName]: {},
      });
      context.core.elasticsearch.client.asInternalUser.index.mockResolvedValueOnce({
        result: 'created',
      } as WriteResponseBase);

      postResultsRoute(server.router, logger);
    });

    it('should authorize index', async () => {
      const response = await server.inject(req, requestContextMock.convertContext(context));
      expect(mockCheckIndicesPrivileges).toHaveBeenCalledWith({
        client: context.core.elasticsearch.client,
        indices: [resultDocument.indexName],
      });
      expect(context.core.elasticsearch.client.asInternalUser.index).toHaveBeenCalled();
      expect(response.status).toEqual(200);
      expect(response.body).toEqual({ result: 'created' });
    });

    it('should authorize data stream', async () => {
      const dataStreamName = 'test_data_stream_name';
      context.core.elasticsearch.client.asInternalUser.indices.get.mockResolvedValue({
        [resultDocument.indexName]: { data_stream: dataStreamName },
      });
      mockCheckIndicesPrivileges.mockResolvedValueOnce({ [dataStreamName]: true });

      const response = await server.inject(req, requestContextMock.convertContext(context));
      expect(mockCheckIndicesPrivileges).toHaveBeenCalledWith({
        client: context.core.elasticsearch.client,
        indices: [dataStreamName],
      });
      expect(context.core.elasticsearch.client.asInternalUser.index).toHaveBeenCalled();
      expect(response.status).toEqual(200);
      expect(response.body).toEqual({ result: 'created' });
    });

    it('should not index unauthorized index', async () => {
      mockCheckIndicesPrivileges.mockResolvedValueOnce({ [resultDocument.indexName]: false });

      const response = await server.inject(req, requestContextMock.convertContext(context));
      expect(mockCheckIndicesPrivileges).toHaveBeenCalledWith({
        client: context.core.elasticsearch.client,
        indices: [resultDocument.indexName],
      });
      expect(context.core.elasticsearch.client.asInternalUser.index).not.toHaveBeenCalled();

      expect(response.status).toEqual(200);
      expect(response.body).toEqual({ result: 'noop' });
    });

    it('handles index authorization error', async () => {
      const errorMessage = 'Error!';
      mockCheckIndicesPrivileges.mockRejectedValueOnce(Error(errorMessage));

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
      postResultsRoute(server.router, logger);
    });

    test('disallows invalid pattern', () => {
      const req = requestMock.create({
        method: 'post',
        path: RESULTS_ROUTE_PATH,
        body: { indexName: 'invalid body' },
      });
      const result = server.validate(req);

      expect(result.badRequest).toHaveBeenCalled();
    });
  });
});
