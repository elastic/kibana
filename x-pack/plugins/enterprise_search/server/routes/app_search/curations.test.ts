/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MockRouter, mockRequestHandler, mockDependencies } from '../../__mocks__';

import { registerCurationsRoutes } from './curations';

describe('curations routes', () => {
  describe('GET /internal/app_search/engines/{engineName}/curations', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'get',
        path: '/internal/app_search/engines/{engineName}/curations',
      });

      registerCurationsRoutes({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request handler', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/as/engines/:engineName/curations/collection',
      });
    });

    describe('validates', () => {
      it('with pagination query params', () => {
        const request = {
          query: {
            'page[current]': 1,
            'page[size]': 10,
          },
        };
        mockRouter.shouldValidate(request);
      });

      it('missing query params', () => {
        const request = { query: {} };
        mockRouter.shouldThrow(request);
      });
    });
  });

  describe('POST /internal/app_search/engines/{engineName}/curations', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'post',
        path: '/internal/app_search/engines/{engineName}/curations',
      });

      registerCurationsRoutes({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request handler', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/as/engines/:engineName/curations/collection',
      });
    });

    describe('validates', () => {
      it('with curation queries', () => {
        const request = {
          body: {
            queries: ['a', 'b', 'c'],
          },
        };
        mockRouter.shouldValidate(request);
      });

      it('empty queries array', () => {
        const request = {
          body: {
            queries: [],
          },
        };
        mockRouter.shouldThrow(request);
      });

      it('empty query strings', () => {
        const request = {
          body: {
            queries: ['', '', ''],
          },
        };
        mockRouter.shouldThrow(request);
      });

      it('missing queries', () => {
        const request = { body: {} };
        mockRouter.shouldThrow(request);
      });
    });
  });

  describe('DELETE /internal/app_search/engines/{engineName}/curations/{curationId}', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'delete',
        path: '/internal/app_search/engines/{engineName}/curations/{curationId}',
      });

      registerCurationsRoutes({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request handler', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/as/engines/:engineName/curations/:curationId',
      });
    });
  });

  describe('GET /internal/app_search/engines/{engineName}/curations/{curationId}', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'get',
        path: '/internal/app_search/engines/{engineName}/curations/{curationId}',
      });

      registerCurationsRoutes({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request handler', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/as/engines/:engineName/curations/:curationId',
      });
    });
  });

  describe('PUT /internal/app_search/engines/{engineName}/curations/{curationId}', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'put',
        path: '/internal/app_search/engines/{engineName}/curations/{curationId}',
      });

      registerCurationsRoutes({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request handler', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/as/engines/:engineName/curations/:curationId',
      });
    });

    describe('validates', () => {
      it('required body', () => {
        const request = {
          body: {
            query: 'hello',
            queries: ['hello', 'world'],
            promoted: ['some-doc-id'],
            hidden: ['another-doc-id'],
          },
        };
        mockRouter.shouldValidate(request);
      });

      it('missing body', () => {
        const request = { body: {} };
        mockRouter.shouldThrow(request);
      });
    });
  });

  describe('POST /internal/app_search/engines/{engineName}/curations/find_or_create', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'post',
        path: '/internal/app_search/engines/{engineName}/curations/find_or_create',
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
        const request = { body: { query: 'some query' } };
        mockRouter.shouldValidate(request);
      });

      it('missing query', () => {
        const request = { body: {} };
        mockRouter.shouldThrow(request);
      });
    });
  });
});
