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
import type {
  SecurityHasPrivilegesResponse,
  WriteResponseBase,
} from '@elastic/elasticsearch/lib/api/types';
import { resultBody, resultDocument } from './results.mock';

// TODO: https://github.com/elastic/kibana/pull/173185#issuecomment-1908034302
describe.skip('postResultsRoute route', () => {
  describe('indexation', () => {
    let server: ReturnType<typeof serverMock.create>;
    let { context } = requestContextMock.createTools();
    let logger: MockedLogger;

    const req = requestMock.create({ method: 'post', path: RESULTS_ROUTE_PATH, body: resultBody });

    beforeEach(() => {
      jest.clearAllMocks();

      server = serverMock.create();
      logger = loggerMock.create();

      ({ context } = requestContextMock.createTools());

      context.core.elasticsearch.client.asCurrentUser.security.hasPrivileges.mockResolvedValue({
        has_all_requested: true,
      } as unknown as SecurityHasPrivilegesResponse);

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

  describe('request pattern authorization', () => {
    let server: ReturnType<typeof serverMock.create>;
    let { context } = requestContextMock.createTools();
    let logger: MockedLogger;

    const req = requestMock.create({ method: 'post', path: RESULTS_ROUTE_PATH, body: resultBody });

    beforeEach(() => {
      jest.clearAllMocks();

      server = serverMock.create();
      logger = loggerMock.create();

      ({ context } = requestContextMock.createTools());

      context.core.elasticsearch.client.asInternalUser.index.mockResolvedValueOnce({
        result: 'created',
      } as WriteResponseBase);

      postResultsRoute(server.router, logger);
    });

    it('should authorize pattern', async () => {
      const mockHasPrivileges =
        context.core.elasticsearch.client.asCurrentUser.security.hasPrivileges;
      mockHasPrivileges.mockResolvedValueOnce({
        has_all_requested: true,
      } as unknown as SecurityHasPrivilegesResponse);

      const response = await server.inject(req, requestContextMock.convertContext(context));
      expect(mockHasPrivileges).toHaveBeenCalledWith({
        index: [
          {
            names: [resultBody.rollup.pattern],
            privileges: ['all', 'read', 'view_index_metadata'],
          },
        ],
      });
      expect(context.core.elasticsearch.client.asInternalUser.index).toHaveBeenCalled();
      expect(response.status).toEqual(200);
      expect(response.body).toEqual({ result: 'created' });
    });

    it('should not index unauthorized pattern', async () => {
      const mockHasPrivileges =
        context.core.elasticsearch.client.asCurrentUser.security.hasPrivileges;
      mockHasPrivileges.mockResolvedValueOnce({
        has_all_requested: false,
      } as unknown as SecurityHasPrivilegesResponse);

      const response = await server.inject(req, requestContextMock.convertContext(context));
      expect(mockHasPrivileges).toHaveBeenCalledWith({
        index: [
          {
            names: [resultBody.rollup.pattern],
            privileges: ['all', 'read', 'view_index_metadata'],
          },
        ],
      });
      expect(context.core.elasticsearch.client.asInternalUser.index).not.toHaveBeenCalled();

      expect(response.status).toEqual(200);
      expect(response.body).toEqual({ result: 'noop' });
    });

    it('handles pattern authorization error', async () => {
      const errorMessage = 'Error!';
      const mockHasPrivileges =
        context.core.elasticsearch.client.asCurrentUser.security.hasPrivileges;
      mockHasPrivileges.mockRejectedValueOnce({ message: errorMessage });

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
        body: { rollup: resultBody.rollup },
      });
      const result = server.validate(req);

      expect(result.badRequest).toHaveBeenCalled();
    });
  });
});
