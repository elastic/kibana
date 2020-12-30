/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { kibanaResponseFactory } from 'src/core/server';
import { savedObjectsServiceMock } from 'src/core/server/mocks';
import { createMockRouter, MockRouter, routeHandlerContextMock } from './__mocks__/routes.mock';
import { createRequestMock } from './__mocks__/request.mock';

jest.mock('../lib/telemetry/es_ui_open_apis', () => ({
  upsertUIOpenOption: jest.fn(),
}));

jest.mock('../lib/telemetry/es_ui_reindex_apis', () => ({
  upsertUIReindexOption: jest.fn(),
}));

import { upsertUIOpenOption } from '../lib/telemetry/es_ui_open_apis';
import { upsertUIReindexOption } from '../lib/telemetry/es_ui_reindex_apis';
import { registerTelemetryRoutes } from './telemetry';

/**
 * Since these route callbacks are so thin, these serve simply as integration tests
 * to ensure they're wired up to the lib functions correctly. Business logic is tested
 * more thoroughly in the lib/telemetry tests.
 */
describe('Upgrade Assistant Telemetry API', () => {
  let routeDependencies: any;
  let mockRouter: MockRouter;
  beforeEach(() => {
    mockRouter = createMockRouter();
    routeDependencies = {
      getSavedObjectsService: () => savedObjectsServiceMock.create(),
      router: mockRouter,
    };
    registerTelemetryRoutes(routeDependencies);
  });
  afterEach(() => jest.clearAllMocks());

  describe('PUT /api/upgrade_assistant/stats/ui_open', () => {
    it('returns correct payload with single option', async () => {
      const returnPayload = {
        overview: true,
        cluster: false,
        indices: false,
      };

      (upsertUIOpenOption as jest.Mock).mockResolvedValue(returnPayload);

      const resp = await routeDependencies.router.getHandler({
        method: 'put',
        pathPattern: '/api/upgrade_assistant/stats/ui_open',
      })(
        routeHandlerContextMock,
        createRequestMock({ body: returnPayload }),
        kibanaResponseFactory
      );

      expect(resp.payload).toEqual(returnPayload);
    });

    it('returns correct payload with multiple option', async () => {
      const returnPayload = {
        overview: true,
        cluster: true,
        indices: true,
      };

      (upsertUIOpenOption as jest.Mock).mockResolvedValue(returnPayload);

      const resp = await routeDependencies.router.getHandler({
        method: 'put',
        pathPattern: '/api/upgrade_assistant/stats/ui_open',
      })(
        routeHandlerContextMock,
        createRequestMock({
          body: {
            overview: true,
            cluster: true,
            indices: true,
          },
        }),
        kibanaResponseFactory
      );

      expect(resp.payload).toEqual(returnPayload);
    });

    it('returns an error if it throws', async () => {
      (upsertUIOpenOption as jest.Mock).mockRejectedValue(new Error(`scary error!`));

      const resp = await routeDependencies.router.getHandler({
        method: 'put',
        pathPattern: '/api/upgrade_assistant/stats/ui_open',
      })(
        routeHandlerContextMock,
        createRequestMock({
          body: {
            overview: false,
          },
        }),
        kibanaResponseFactory
      );

      expect(resp.status).toEqual(500);
    });
  });

  describe('PUT /api/upgrade_assistant/stats/ui_reindex', () => {
    it('returns correct payload with single option', async () => {
      const returnPayload = {
        close: false,
        open: false,
        start: true,
        stop: false,
      };

      (upsertUIReindexOption as jest.Mock).mockRejectedValue(returnPayload);

      const resp = await routeDependencies.router.getHandler({
        method: 'put',
        pathPattern: '/api/upgrade_assistant/stats/ui_reindex',
      })(
        routeHandlerContextMock,
        createRequestMock({
          body: {
            overview: false,
          },
        }),
        kibanaResponseFactory
      );

      expect(resp.payload).toEqual(returnPayload);
    });

    it('returns correct payload with multiple option', async () => {
      const returnPayload = {
        close: true,
        open: true,
        start: true,
        stop: true,
      };

      (upsertUIReindexOption as jest.Mock).mockRejectedValue(returnPayload);

      const resp = await routeDependencies.router.getHandler({
        method: 'put',
        pathPattern: '/api/upgrade_assistant/stats/ui_reindex',
      })(
        routeHandlerContextMock,
        createRequestMock({
          body: {
            close: true,
            open: true,
            start: true,
            stop: true,
          },
        }),
        kibanaResponseFactory
      );

      expect(resp.payload).toEqual(returnPayload);
    });

    it('returns an error if it throws', async () => {
      (upsertUIReindexOption as jest.Mock).mockRejectedValue(new Error(`scary error!`));

      const resp = await routeDependencies.router.getHandler({
        method: 'put',
        pathPattern: '/api/upgrade_assistant/stats/ui_reindex',
      })(
        routeHandlerContextMock,
        createRequestMock({
          body: {
            start: false,
          },
        }),
        kibanaResponseFactory
      );

      expect(resp.status).toEqual(500);
    });
  });
});
