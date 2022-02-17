/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MockRouter, mockRequestHandler, mockDependencies } from '../../__mocks__';

import { registerSourceEnginesRoutes } from './source_engines';

describe('source engine routes', () => {
  describe('GET /internal/app_search/engines/{name}/source_engines', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'get',
        path: '/internal/app_search/engines/{name}/source_engines',
      });

      registerSourceEnginesRoutes({
        ...mockDependencies,
        router: mockRouter.router,
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

    it('fails validation with missing query params', () => {
      const request = { query: {} };
      mockRouter.shouldThrow(request);
    });

    it('creates a request to enterprise search', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/as/engines/:name/source_engines',
      });
    });
  });

  describe('POST /internal/app_search/engines/{name}/source_engines/bulk_create', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'post',
        path: '/internal/app_search/engines/{name}/source_engines/bulk_create',
      });

      registerSourceEnginesRoutes({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('validates correctly with name', () => {
      const request = { params: { name: 'test-engine' }, body: { source_engine_slugs: [] } };
      mockRouter.shouldValidate(request);
    });

    it('fails validation without name', () => {
      const request = { params: {}, body: { source_engine_slugs: [] } };
      mockRouter.shouldThrow(request);
    });

    it('fails validation with a non-string name', () => {
      const request = { params: { name: 1 }, body: { source_engine_slugs: [] } };
      mockRouter.shouldThrow(request);
    });

    it('fails validation with missing query params', () => {
      const request = { params: { name: 'test-engine' }, body: {} };
      mockRouter.shouldThrow(request);
    });

    it('creates a request to enterprise search', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/as/engines/:name/source_engines/bulk_create',
        hasJsonResponse: false,
      });
    });
  });

  describe('DELETE /internal/app_search/engines/{name}/source_engines/{source_engine_name}', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'delete',
        path: '/internal/app_search/engines/{name}/source_engines/{source_engine_name}',
      });

      registerSourceEnginesRoutes({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('validates correctly with name and source_engine_name', () => {
      const request = { params: { name: 'test-engine', source_engine_name: 'source-engine' } };
      mockRouter.shouldValidate(request);
    });

    it('fails validation without name', () => {
      const request = { params: { source_engine_name: 'source-engine' } };
      mockRouter.shouldThrow(request);
    });

    it('fails validation with a non-string name', () => {
      const request = { params: { name: 1, source_engine_name: 'source-engine' } };
      mockRouter.shouldThrow(request);
    });

    it('fails validation without source_engine_name', () => {
      const request = { params: { name: 'test-engine' } };
      mockRouter.shouldThrow(request);
    });

    it('fails validation with a non-string source_engine_name', () => {
      const request = { params: { name: 'test-engine', source_engine_name: 1 } };
      mockRouter.shouldThrow(request);
    });

    it('fails validation with missing query params', () => {
      const request = { query: {} };
      mockRouter.shouldThrow(request);
    });

    it('creates a request to enterprise search', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/as/engines/:name/source_engines/:source_engine_name',
        hasJsonResponse: false,
      });
    });
  });
});
