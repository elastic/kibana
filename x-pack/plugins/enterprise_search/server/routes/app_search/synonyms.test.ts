/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MockRouter, mockRequestHandler, mockDependencies } from '../../__mocks__';

import { registerSynonymsRoutes } from './synonyms';

describe('synonyms routes', () => {
  describe('GET /api/app_search/engines/{engineName}/synonyms', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'get',
        path: '/api/app_search/engines/{engineName}/synonyms',
      });

      registerSynonymsRoutes({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request handler', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/as/engines/:engineName/synonyms/collection',
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

  describe('POST /api/app_search/engines/{engineName}/synonyms', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'post',
        path: '/api/app_search/engines/{engineName}/synonyms',
      });

      registerSynonymsRoutes({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request handler', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/as/engines/:engineName/synonyms/collection',
      });
    });
  });

  describe('PUT /api/app_search/engines/{engineName}/synonyms/{synonymId}', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'put',
        path: '/api/app_search/engines/{engineName}/synonyms/{synonymId}',
      });

      registerSynonymsRoutes({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request handler', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/as/engines/:engineName/synonyms/:synonymId',
      });
    });
  });

  describe('DELETE /api/app_search/engines/{engineName}/synonyms/{synonymId}', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'delete',
        path: '/api/app_search/engines/{engineName}/synonyms/{synonymId}',
      });

      registerSynonymsRoutes({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request handler', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/as/engines/:engineName/synonyms/:synonymId',
      });
    });
  });
});
