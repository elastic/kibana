/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MockRouter, mockRequestHandler, mockDependencies } from '../../__mocks__';

import { registerSearchRelevanceSuggestionsRoutes } from './adaptive_relevance';

describe('search relevance insights routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /internal/app_search/engines/{name}/adaptive_relevance/suggestions', () => {
    const mockRouter = new MockRouter({
      method: 'post',
      path: '/internal/app_search/engines/{engineName}/adaptive_relevance/suggestions',
    });

    beforeEach(() => {
      registerSearchRelevanceSuggestionsRoutes({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request to enterprise search', () => {
      mockRouter.callRoute({
        params: { engineName: 'some-engine' },
      });

      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/api/as/v0/engines/:engineName/adaptive_relevance/suggestions',
      });
    });
  });

  describe('PUT /internal/app_search/engines/{name}/adaptive_relevance/suggestions', () => {
    const mockRouter = new MockRouter({
      method: 'put',
      path: '/internal/app_search/engines/{engineName}/adaptive_relevance/suggestions',
    });

    beforeEach(() => {
      registerSearchRelevanceSuggestionsRoutes({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request to enterprise search', () => {
      mockRouter.callRoute({
        params: { engineName: 'some-engine' },
        body: {
          query: 'some query',
          type: 'curation',
          status: 'applied',
        },
      });

      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/api/as/v0/engines/:engineName/adaptive_relevance/suggestions',
      });
    });
  });

  describe('GET /internal/app_search/engines/{name}/adaptive_relevance/settings', () => {
    const mockRouter = new MockRouter({
      method: 'get',
      path: '/internal/app_search/engines/{engineName}/adaptive_relevance/settings',
    });

    beforeEach(() => {
      registerSearchRelevanceSuggestionsRoutes({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request to enterprise search', () => {
      mockRouter.callRoute({
        params: { engineName: 'some-engine' },
      });

      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/api/as/v0/engines/:engineName/adaptive_relevance/settings',
      });
    });
  });

  describe('PUT /internal/app_search/engines/{name}/adaptive_relevance/settings', () => {
    const mockRouter = new MockRouter({
      method: 'put',
      path: '/internal/app_search/engines/{engineName}/adaptive_relevance/settings',
    });

    beforeEach(() => {
      registerSearchRelevanceSuggestionsRoutes({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request to enterprise search', () => {
      mockRouter.callRoute({
        params: { engineName: 'some-engine' },
        body: { curation: { enabled: true } },
      });

      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/api/as/v0/engines/:engineName/adaptive_relevance/settings',
      });
    });
  });

  describe('GET /internal/app_search/engines/{engineName}/adaptive_relevance/suggestions/{query}', () => {
    const mockRouter = new MockRouter({
      method: 'get',
      path: '/internal/app_search/engines/{engineName}/adaptive_relevance/suggestions/{query}',
    });

    beforeEach(() => {
      registerSearchRelevanceSuggestionsRoutes({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request to enterprise search', () => {
      mockRouter.callRoute({
        params: { engineName: 'some-engine', query: 'foo' },
        query: { type: 'curation' },
      });

      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/as/engines/:engineName/adaptive_relevance/suggestions/:query',
      });
    });
  });
});
