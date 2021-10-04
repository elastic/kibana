/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MockRouter, mockRequestHandler, mockDependencies } from '../../__mocks__';

import { registerApiLogsRoutes } from './api_logs';

describe('API logs routes', () => {
  describe('GET /internal/app_search/engines/{engineName}/api_logs', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'get',
        path: '/internal/app_search/engines/{engineName}/api_logs',
      });

      registerApiLogsRoutes({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request handler', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/as/engines/:engineName/api_logs/collection',
      });
    });

    describe('validates', () => {
      it('with required query params', () => {
        const request = {
          query: {
            'filters[date][from]': '1970-01-01T12:00:00.000Z',
            'filters[date][to]': '1970-01-02T12:00:00.000Z',
            'page[current]': 1,
            sort_direction: 'desc',
          },
        };
        mockRouter.shouldValidate(request);
      });

      it('missing params', () => {
        const request = { query: {} };
        mockRouter.shouldThrow(request);
      });
    });
  });
});
