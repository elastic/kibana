/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MockRouter, mockRequestHandler, mockDependencies } from '../../__mocks__';

import { registerApiKeysRoute } from './api_keys';

describe('api keys routes', () => {
  describe('GET /internal/workplace_search/api_keys', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'get',
        path: '/internal/workplace_search/api_keys',
      });

      registerApiKeysRoute({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request handler', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/ws/org/api_tokens',
      });
    });
  });

  describe('POST /internal/workplace_search/api_keys', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'post',
        path: '/internal/workplace_search/api_keys',
      });

      registerApiKeysRoute({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request handler', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/ws/org/api_tokens',
      });
    });

    describe('validates', () => {
      it('correctly', () => {
        const request = {
          body: {
            name: 'my-api-key',
          },
        };
        mockRouter.shouldValidate(request);
      });
    });
  });

  describe('DELETE /internal/workplace_search/api_keys/{tokenName}', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'delete',
        path: '/internal/workplace_search/api_keys/{tokenName}',
      });

      registerApiKeysRoute({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request handler', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/ws/org/api_tokens/:tokenName',
      });
    });
  });
});
