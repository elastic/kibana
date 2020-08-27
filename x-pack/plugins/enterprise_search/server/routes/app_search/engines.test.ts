/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MockRouter, mockRequestHandler, mockDependencies } from '../../__mocks__';

import { registerEnginesRoute } from './engines';

describe('engine routes', () => {
  describe('GET /api/app_search/engines', () => {
    const AUTH_HEADER = 'Basic 123';
    const mockRequest = {
      headers: {
        authorization: AUTH_HEADER,
      },
      query: {
        type: 'indexed',
        pageIndex: 1,
      },
    };

    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({ method: 'get', payload: 'query' });

      registerEnginesRoute({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request handler', () => {
      mockRouter.callRoute(mockRequest);

      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/as/engines/collection',
        params: { type: 'indexed', 'page[current]': 1, 'page[size]': 10 },
        hasValidData: expect.any(Function),
      });
    });

    it('passes custom parameters to enterpriseSearchRequestHandler', () => {
      mockRouter.callRoute({ query: { type: 'meta', pageIndex: 99 } });

      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/as/engines/collection',
        params: { type: 'meta', 'page[current]': 99, 'page[size]': 10 },
        hasValidData: expect.any(Function),
      });
    });

    describe('hasValidData', () => {
      it('should correctly validate that the response has data', () => {
        const response = {
          meta: {
            page: {
              total_results: 1,
            },
          },
          results: [],
        };

        mockRouter.callRoute(mockRequest);
        expect(mockRequestHandler.hasValidData(response)).toBe(true);
      });

      it('should correctly validate that a response does not have data', () => {
        const response = {};

        mockRouter.callRoute(mockRequest);
        expect(mockRequestHandler.hasValidData(response)).toBe(false);
      });
    });

    describe('validates', () => {
      it('correctly', () => {
        const request = { query: { type: 'meta', pageIndex: 5 } };
        mockRouter.shouldValidate(request);
      });

      it('wrong pageIndex type', () => {
        const request = { query: { type: 'indexed', pageIndex: 'indexed' } };
        mockRouter.shouldThrow(request);
      });

      it('wrong type string', () => {
        const request = { query: { type: 'invalid', pageIndex: 1 } };
        mockRouter.shouldThrow(request);
      });

      it('missing pageIndex', () => {
        const request = { query: { type: 'indexed' } };
        mockRouter.shouldThrow(request);
      });

      it('missing type', () => {
        const request = { query: { pageIndex: 1 } };
        mockRouter.shouldThrow(request);
      });
    });
  });
});
