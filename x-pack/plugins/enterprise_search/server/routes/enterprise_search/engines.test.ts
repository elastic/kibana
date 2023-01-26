/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockDependencies, mockRequestHandler, MockRouter } from '../../__mocks__';

import { registerEnginesRoutes } from './engines';

describe('engines routes', () => {
  describe('GET /internal/enterprise_search/engines', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'get',
        path: '/internal/enterprise_search/engines',
      });

      registerEnginesRoutes({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request to enterprise search', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/api/engines',
      });
    });

    it('validates query parameters', () => {
      const request = { query: { from: 20, size: 20 } };

      mockRouter.shouldValidate(request);
    });

    it('fails validation with invalid from parameter', () => {
      const request = { query: { from: -10 } };

      mockRouter.shouldThrow(request);
    });

    it('fails validation with invalid size parameter', () => {
      const request = { query: { size: 0 } };

      mockRouter.shouldThrow(request);
    });
  });

  describe('POST /internal/enterprise_search/engines', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'post',
        path: '/internal/enterprise_search/engines',
      });

      registerEnginesRoutes({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request to enterprise search', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/api/engines',
      });
    });

    it('validates correctly with engine_name', () => {
      const request = {
        body: {
          indices: ['search-unit-test'],
          name: 'some-engine',
        },
      };

      mockRouter.shouldValidate(request);
    });

    it('fails validation without body', () => {
      const request = { params: {} };

      mockRouter.shouldThrow(request);
    });

    it('fails validation without name', () => {
      const request = {
        body: {
          indices: ['search-unit-test'],
        },
      };

      mockRouter.shouldThrow(request);
    });

    it('fails validation without indices', () => {
      const request = {
        body: {
          name: 'some-engine',
        },
      };

      mockRouter.shouldThrow(request);
    });
  });

  describe('GET /internal/enterprise_search/engines/{engine_name}', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'get',
        path: '/internal/enterprise_search/engines/{engine_name}',
      });

      registerEnginesRoutes({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request to enterprise search', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/api/engines/:engine_name',
      });
    });

    it('validates correctly with engine_name', () => {
      const request = { params: { engine_name: 'some-engine' } };

      mockRouter.shouldValidate(request);
    });

    it('fails validation without name', () => {
      const request = { params: {} };

      mockRouter.shouldThrow(request);
    });
  });

  describe('PUT /internal/enterprise_search/engines/{engine_name}', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'put',
        path: '/internal/enterprise_search/engines/{engine_name}',
      });

      registerEnginesRoutes({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request to enterprise search', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/api/engines/:engine_name',
      });
    });

    it('validates correctly with engine_name', () => {
      const request = {
        params: { engine_name: 'some-engine' },
        body: {
          indices: ['search-unit-test'],
        },
      };

      mockRouter.shouldValidate(request);
    });

    it('fails validation without name', () => {
      const request = { params: {} };

      mockRouter.shouldThrow(request);
    });

    it('fails validation without indices', () => {
      const request = {
        params: { engine_name: 'some-engine' },
        body: {
          name: 'some-engine',
        },
      };

      mockRouter.shouldThrow(request);
    });
  });

  describe('DELETE /internal/enterprise_search/engines/{engine_name}', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'delete',
        path: '/internal/enterprise_search/engines/{engine_name}',
      });

      registerEnginesRoutes({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request to enterprise search', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/api/engines/:engine_name',
      });
    });

    it('validates correctly with engine_name', () => {
      const request = { params: { engine_name: 'some-engine' } };

      mockRouter.shouldValidate(request);
    });

    it('fails validation without name', () => {
      const request = { params: {} };

      mockRouter.shouldThrow(request);
    });
  });
});
