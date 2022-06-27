/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kibanaResponseFactory } from '@kbn/core/server';
import { createMockRouter, MockRouter, routeHandlerContextMock } from './__mocks__/routes.mock';
import { createRequestMock } from './__mocks__/request.mock';
import { handleEsError } from '../shared_imports';

jest.mock('../lib/es_version_precheck', () => ({
  versionCheckHandlerWrapper: (a: any) => a,
}));

import { registerDeprecationLoggingRoutes } from './deprecation_logging';

/**
 * Since these route callbacks are so thin, these serve simply as integration tests
 * to ensure they're wired up to the lib functions correctly. Business logic is tested
 * more thoroughly in the es_deprecation_logging_apis test.
 */
describe('deprecation logging API', () => {
  let mockRouter: MockRouter;
  let routeDependencies: any;

  beforeEach(() => {
    mockRouter = createMockRouter();
    routeDependencies = {
      router: mockRouter,
      lib: { handleEsError },
    };
    registerDeprecationLoggingRoutes(routeDependencies);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('GET /api/upgrade_assistant/deprecation_logging', () => {
    it('returns that indexing and writing logs is enabled', async () => {
      (
        routeHandlerContextMock.core.elasticsearch.client.asCurrentUser.cluster
          .getSettings as jest.Mock
      ).mockResolvedValue({
        defaults: {
          cluster: { deprecation_indexing: { enabled: 'true' } },
        },
      });

      const resp = await routeDependencies.router.getHandler({
        method: 'get',
        pathPattern: '/api/upgrade_assistant/deprecation_logging',
      })(routeHandlerContextMock, createRequestMock(), kibanaResponseFactory);

      expect(resp.status).toEqual(200);
      expect(resp.payload).toEqual({
        isDeprecationLogIndexingEnabled: true,
        isDeprecationLoggingEnabled: true,
      });
    });

    it('returns an error if it throws', async () => {
      (
        routeHandlerContextMock.core.elasticsearch.client.asCurrentUser.cluster
          .getSettings as jest.Mock
      ).mockRejectedValue(new Error('scary error!'));
      await expect(
        routeDependencies.router.getHandler({
          method: 'get',
          pathPattern: '/api/upgrade_assistant/deprecation_logging',
        })(routeHandlerContextMock, createRequestMock(), kibanaResponseFactory)
      ).rejects.toThrow('scary error!');
    });
  });

  describe('PUT /api/upgrade_assistant/deprecation_logging', () => {
    it('returns that indexing and writing logs is enabled', async () => {
      (
        routeHandlerContextMock.core.elasticsearch.client.asCurrentUser.cluster
          .putSettings as jest.Mock
      ).mockResolvedValue({
        defaults: {
          logger: { deprecation: 'WARN' },
          cluster: { deprecation_indexing: { enabled: 'true' } },
        },
      });

      const resp = await routeDependencies.router.getHandler({
        method: 'put',
        pathPattern: '/api/upgrade_assistant/deprecation_logging',
      })(routeHandlerContextMock, { body: { isEnabled: true } }, kibanaResponseFactory);

      expect(resp.payload).toEqual({
        isDeprecationLogIndexingEnabled: true,
        isDeprecationLoggingEnabled: true,
      });
    });

    it('returns an error if it throws', async () => {
      (
        routeHandlerContextMock.core.elasticsearch.client.asCurrentUser.cluster
          .putSettings as jest.Mock
      ).mockRejectedValue(new Error('scary error!'));
      await expect(
        routeDependencies.router.getHandler({
          method: 'put',
          pathPattern: '/api/upgrade_assistant/deprecation_logging',
        })(routeHandlerContextMock, { body: { isEnabled: false } }, kibanaResponseFactory)
      ).rejects.toThrow('scary error!');
    });
  });

  describe('GET /api/upgrade_assistant/deprecation_logging/count', () => {
    const MOCK_FROM_DATE = '2021-08-23T07:32:34.782Z';

    it('returns count of deprecations', async () => {
      (
        routeHandlerContextMock.core.elasticsearch.client.asCurrentUser.indices.exists as jest.Mock
      ).mockResolvedValue(true);
      (
        routeHandlerContextMock.core.elasticsearch.client.asCurrentUser.count as jest.Mock
      ).mockResolvedValue({ count: 10 });

      const resp = await routeDependencies.router.getHandler({
        method: 'get',
        pathPattern: '/api/upgrade_assistant/deprecation_logging/count',
      })(
        routeHandlerContextMock,
        createRequestMock({ query: { from: MOCK_FROM_DATE } }),
        kibanaResponseFactory
      );

      expect(resp.status).toEqual(200);
      expect(resp.payload).toEqual({ count: 10 });
    });

    it('returns zero matches when deprecation logs index is not created', async () => {
      (
        routeHandlerContextMock.core.elasticsearch.client.asCurrentUser.indices.exists as jest.Mock
      ).mockResolvedValue(false);

      const resp = await routeDependencies.router.getHandler({
        method: 'get',
        pathPattern: '/api/upgrade_assistant/deprecation_logging/count',
      })(
        routeHandlerContextMock,
        createRequestMock({ query: { from: MOCK_FROM_DATE } }),
        kibanaResponseFactory
      );

      expect(resp.status).toEqual(200);
      expect(resp.payload).toEqual({ count: 0 });
    });

    it('returns an error if it throws', async () => {
      (
        routeHandlerContextMock.core.elasticsearch.client.asCurrentUser.indices.exists as jest.Mock
      ).mockRejectedValue(new Error('scary error!'));
      await expect(
        routeDependencies.router.getHandler({
          method: 'get',
          pathPattern: '/api/upgrade_assistant/deprecation_logging/count',
        })(routeHandlerContextMock, createRequestMock(), kibanaResponseFactory)
      ).rejects.toThrow('scary error!');
    });
  });

  describe('DELETE /api/upgrade_assistant/deprecation_logging/cache', () => {
    it('returns ok if if the cache was deleted', async () => {
      (
        routeHandlerContextMock.core.elasticsearch.client.asCurrentUser.transport
          .request as jest.Mock
      ).mockResolvedValue('ok');

      const resp = await routeDependencies.router.getHandler({
        method: 'delete',
        pathPattern: '/api/upgrade_assistant/deprecation_logging/cache',
      })(routeHandlerContextMock, createRequestMock(), kibanaResponseFactory);

      expect(resp.status).toEqual(200);
      expect(
        routeHandlerContextMock.core.elasticsearch.client.asCurrentUser.transport.request
      ).toHaveBeenCalledWith({
        method: 'DELETE',
        path: '/_logging/deprecation_cache',
      });
      expect(resp.payload).toEqual('ok');
    });

    it('returns an error if it throws', async () => {
      (
        routeHandlerContextMock.core.elasticsearch.client.asCurrentUser.transport
          .request as jest.Mock
      ).mockRejectedValue(new Error('scary error!'));
      await expect(
        routeDependencies.router.getHandler({
          method: 'delete',
          pathPattern: '/api/upgrade_assistant/deprecation_logging/cache',
        })(routeHandlerContextMock, createRequestMock(), kibanaResponseFactory)
      ).rejects.toThrow('scary error!');
    });
  });
});
