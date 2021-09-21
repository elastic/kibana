/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MockRouter, mockRequestHandler, mockDependencies } from '../../__mocks__';

import { registerSearchRelevanceInsightsRoutes } from './search_relevance_insights';

describe('search relevance insights routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /internal/app_search/engines/{name}/search_relevance_insights/settings', () => {
    const mockRouter = new MockRouter({
      method: 'get',
      path: '/internal/app_search/engines/{engineName}/search_relevance_insights/settings',
    });

    beforeEach(() => {
      registerSearchRelevanceInsightsRoutes({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request to enterprise search', () => {
      mockRouter.callRoute({
        params: { engineName: 'some-engine' },
      });

      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/api/as/v1/engines/:engineName/search_relevance_insights/settings',
      });
    });
  });

  describe('PUT /internal/app_search/engines/{name}/search_relevance_insights/settings', () => {
    const mockRouter = new MockRouter({
      method: 'put',
      path: '/internal/app_search/engines/{engineName}/search_relevance_insights/settings',
    });

    beforeEach(() => {
      registerSearchRelevanceInsightsRoutes({
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
        path: '/api/as/v1/engines/:engineName/search_relevance_insights/settings',
      });
    });
  });
});
