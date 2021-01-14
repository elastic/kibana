/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MockRouter, mockRequestHandler, mockDependencies } from '../../__mocks__';

import { registerAnalyticsRoutes } from './analytics';

describe('analytics routes', () => {
  describe('GET /api/app_search/engines/{engineName}/analytics/queries', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'get',
        path: '/api/app_search/engines/{engineName}/analytics/queries',
        payload: 'query',
      });

      registerAnalyticsRoutes({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request handler', () => {
      mockRouter.callRoute({
        params: { engineName: 'some-engine' },
      });

      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/as/engines/some-engine/analytics/queries',
      });
    });

    describe('validates', () => {
      it('correctly without optional query params', () => {
        const request = { query: {} };
        mockRouter.shouldValidate(request);
      });

      it('correctly with all optional query params', () => {
        const request = {
          query: {
            size: 20,
            start: '1970-01-01',
            end: '1970-01-02',
            tag: 'some-tag',
          },
        };
        mockRouter.shouldValidate(request);
      });

      it('incorrect types', () => {
        const request = {
          query: {
            start: 100,
            size: '100',
          },
        };
        mockRouter.shouldThrow(request);
      });
    });
  });

  describe('GET /api/app_search/engines/{engineName}/analytics/queries/{query}', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'get',
        path: '/api/app_search/engines/{engineName}/analytics/queries/{query}',
        payload: 'query',
      });

      registerAnalyticsRoutes({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request handler', () => {
      mockRouter.callRoute({
        params: { engineName: 'some-engine', query: 'some-query' },
      });

      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/as/engines/some-engine/analytics/query/some-query',
      });
    });

    describe('validates', () => {
      it('correctly without optional query params', () => {
        const request = { query: {} };
        mockRouter.shouldValidate(request);
      });

      it('correctly with all optional query params', () => {
        const request = {
          query: {
            start: '1970-01-01',
            end: '1970-01-02',
            tag: 'some-tag',
          },
        };
        mockRouter.shouldValidate(request);
      });

      it('incorrect types', () => {
        const request = {
          query: {
            start: 100,
            tag: false,
          },
        };
        mockRouter.shouldThrow(request);
      });
    });
  });
});
