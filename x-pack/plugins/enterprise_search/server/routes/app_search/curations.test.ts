/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MockRouter, mockRequestHandler, mockDependencies } from '../../__mocks__';

import { registerCurationsRoutes } from './curations';

describe('curations routes', () => {
  describe('GET /api/app_search/engines/{engineName}/curations/find_or_create', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'get',
        path: '/api/app_search/engines/{engineName}/curations/find_or_create',
      });

      registerCurationsRoutes({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request handler', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/as/engines/:engineName/curations/find_or_create',
      });
    });

    describe('validates', () => {
      it('required query param', () => {
        const request = { query: { query: 'some query' } };
        mockRouter.shouldValidate(request);
      });

      it('missing query', () => {
        const request = { query: {} };
        mockRouter.shouldThrow(request);
      });
    });
  });
});
