/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MockRouter, mockRequestHandler, mockDependencies } from '../../__mocks__';

import { registerEnginesRoutes } from './engines';

describe('engine routes', () => {
  describe('GET /internal/app_search/engines', () => {
    const mockRequest = {
      query: {
        type: 'indexed',
        'page[current]': 1,
        'page[size]': 10,
      },
    };

    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'get',
        path: '/internal/app_search/engines',
      });

      registerEnginesRoutes({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request handler', () => {
      mockRouter.callRoute(mockRequest);

      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/as/engines/collection',
        hasValidData: expect.any(Function),
      });
    });

    describe('hasValidData', () => {
      it('should correctly validate that the response has data', () => {
        mockRequestHandler.createRequest.mockClear();
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
        mockRequestHandler.createRequest.mockClear();
        const response = {};

        mockRouter.callRoute(mockRequest);
        expect(mockRequestHandler.hasValidData(response)).toBe(false);
      });
    });

    describe('validates', () => {
      it('correctly', () => {
        const request = {
          query: {
            type: 'meta',
            'page[current]': 5,
            'page[size]': 10,
          },
        };
        mockRouter.shouldValidate(request);
      });

      it('wrong type string', () => {
        const request = {
          query: {
            type: 'invalid',
            'page[current]': 5,
            'page[size]': 10,
          },
        };
        mockRouter.shouldThrow(request);
      });

      it('missing query params', () => {
        const request = { query: {} };
        mockRouter.shouldThrow(request);
      });
    });
  });

  describe('POST /internal/app_search/engines', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'post',
        path: '/internal/app_search/engines',
      });

      registerEnginesRoutes({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request handler', () => {
      mockRouter.callRoute({ body: { name: 'some-engine', language: 'en' } });
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/as/engines/collection',
      });
    });

    describe('validates', () => {
      describe('indexed engines', () => {
        it('correctly', () => {
          const request = { body: { name: 'some-engine', language: 'en' } };
          mockRouter.shouldValidate(request);
        });

        it('missing name', () => {
          const request = { body: { language: 'en' } };
          mockRouter.shouldThrow(request);
        });

        it('optional language', () => {
          const request = { body: { name: 'some-engine' } };
          mockRouter.shouldValidate(request);
        });
      });

      describe('meta engines', () => {
        it('all properties', () => {
          const request = {
            body: { name: 'some-meta-engine', type: 'any', language: 'en', source_engines: [] },
          };
          mockRouter.shouldValidate(request);
        });

        it('missing name', () => {
          const request = {
            body: { type: 'any', language: 'en', source_engines: [] },
          };
          mockRouter.shouldThrow(request);
        });

        it('optional language', () => {
          const request = {
            body: { name: 'some-meta-engine', type: 'any', source_engines: [] },
          };
          mockRouter.shouldValidate(request);
        });

        it('optional source_engines', () => {
          const request = {
            body: { name: 'some-meta-engine', type: 'any', language: 'en' },
          };
          mockRouter.shouldValidate(request);
        });

        it('optional type', () => {
          const request = { body: { name: 'some-engine' } };
          mockRouter.shouldValidate(request);
        });
      });
    });
  });

  describe('POST /internal/app_search/elasticsearch/engines', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'post',
        path: '/internal/app_search/elasticsearch/engines',
      });

      registerEnginesRoutes({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request handler', () => {
      mockRouter.callRoute({
        body: {
          name: 'some-elasticindexed-engine',
          search_index: { type: 'elasticsearch', index_name: 'search-elastic-index' },
        },
      });
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/api/as/v0/engines',
      });
    });

    describe('validates', () => {
      describe('indexed engines', () => {
        it('correctly', () => {
          const request = {
            body: {
              name: 'some-engine',
              search_index: { type: 'elasticsearch', index_name: 'search-elastic-index' },
            },
          };
          mockRouter.shouldValidate(request);
        });

        it('missing name', () => {
          const request = {
            body: {
              search_index: { type: 'elasticsearch', index_name: 'search-elastic-index' },
            },
          };
          mockRouter.shouldThrow(request);
        });

        it('missing index_name', () => {
          const request = {
            name: 'some-engine',
            body: {
              search_index: { type: 'elasticsearch' },
            },
          };
          mockRouter.shouldThrow(request);
        });
      });
    });
  });

  describe('GET /internal/app_search/engines/{name}', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'get',
        path: '/internal/app_search/engines/{name}',
      });

      registerEnginesRoutes({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request to enterprise search', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/as/engines/:name/details',
      });
    });
  });

  describe('DELETE /internal/app_search/engines/{name}', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'delete',
        path: '/internal/app_search/engines/{name}',
      });

      registerEnginesRoutes({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request to enterprise search', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/as/engines/:name',
      });
    });

    it('validates correctly with name', () => {
      const request = { params: { name: 'test-engine' } };
      mockRouter.shouldValidate(request);
    });

    it('fails validation without name', () => {
      const request = { params: {} };
      mockRouter.shouldThrow(request);
    });

    it('fails validation with a non-string name', () => {
      const request = { params: { name: 1 } };
      mockRouter.shouldThrow(request);
    });
  });

  describe('GET /internal/app_search/engines/{name}/overview', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'get',
        path: '/internal/app_search/engines/{name}/overview',
      });

      registerEnginesRoutes({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request to enterprise search', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/as/engines/:name/overview_metrics',
      });
    });
  });
});
