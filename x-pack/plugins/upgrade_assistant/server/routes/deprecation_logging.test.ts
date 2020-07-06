/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { kibanaResponseFactory } from 'src/core/server';
import { createMockRouter, MockRouter, routeHandlerContextMock } from './__mocks__/routes.mock';
import { createRequestMock } from './__mocks__/request.mock';

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
    };
    registerDeprecationLoggingRoutes(routeDependencies);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('GET /api/upgrade_assistant/deprecation_logging', () => {
    it('returns isEnabled', async () => {
      (routeHandlerContextMock.core.elasticsearch.legacy.client
        .callAsCurrentUser as jest.Mock).mockResolvedValue({
        default: { logger: { deprecation: 'WARN' } },
      });
      const resp = await routeDependencies.router.getHandler({
        method: 'get',
        pathPattern: '/api/upgrade_assistant/deprecation_logging',
      })(routeHandlerContextMock, createRequestMock(), kibanaResponseFactory);

      expect(resp.status).toEqual(200);
      expect(resp.payload).toEqual({ isEnabled: true });
    });

    it('returns an error if it throws', async () => {
      (routeHandlerContextMock.core.elasticsearch.legacy.client
        .callAsCurrentUser as jest.Mock).mockRejectedValue(new Error(`scary error!`));
      const resp = await routeDependencies.router.getHandler({
        method: 'get',
        pathPattern: '/api/upgrade_assistant/deprecation_logging',
      })(routeHandlerContextMock, createRequestMock(), kibanaResponseFactory);

      expect(resp.status).toEqual(500);
    });
  });

  describe('PUT /api/upgrade_assistant/deprecation_logging', () => {
    it('returns isEnabled', async () => {
      (routeHandlerContextMock.core.elasticsearch.legacy.client
        .callAsCurrentUser as jest.Mock).mockResolvedValue({
        default: { logger: { deprecation: 'ERROR' } },
      });
      const resp = await routeDependencies.router.getHandler({
        method: 'get',
        pathPattern: '/api/upgrade_assistant/deprecation_logging',
      })(routeHandlerContextMock, createRequestMock(), kibanaResponseFactory);

      expect(resp.payload).toEqual({ isEnabled: false });
    });

    it('returns an error if it throws', async () => {
      (routeHandlerContextMock.core.elasticsearch.legacy.client
        .callAsCurrentUser as jest.Mock).mockRejectedValue(new Error(`scary error!`));
      const resp = await routeDependencies.router.getHandler({
        method: 'put',
        pathPattern: '/api/upgrade_assistant/deprecation_logging',
      })(routeHandlerContextMock, { body: { isEnabled: false } }, kibanaResponseFactory);

      expect(resp.status).toEqual(500);
    });
  });
});
