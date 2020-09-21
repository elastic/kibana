/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MockRouter, mockRequestHandler, mockDependencies } from '../../__mocks__';

import { registerCredentialsRoutes } from './credentials';

describe('credentials routes', () => {
  describe('GET /api/app_search/credentials', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({ method: 'get', payload: 'query' });

      registerCredentialsRoutes({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request handler', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/as/credentials/collection',
      });
    });

    describe('validates', () => {
      it('correctly', () => {
        const request = { query: { 'page[current]': 1 } };
        mockRouter.shouldValidate(request);
      });

      it('missing page[current]', () => {
        const request = { query: {} };
        mockRouter.shouldThrow(request);
      });
    });
  });

  describe('GET /api/app_search/credentials/details', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({ method: 'get', payload: 'query' });

      registerCredentialsRoutes({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request handler', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/as/credentials/details',
      });
    });
  });

  describe('DELETE /api/app_search/credentials/{name}', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({ method: 'delete', payload: 'params' });

      registerCredentialsRoutes({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request to enterprise search', () => {
      const mockRequest = {
        params: {
          name: 'abc123',
        },
      };

      mockRouter.callRoute(mockRequest);

      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/as/credentials/abc123',
      });
    });
  });
});
