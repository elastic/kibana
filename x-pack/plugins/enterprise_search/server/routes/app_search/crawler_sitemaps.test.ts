/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockDependencies, mockRequestHandler, MockRouter } from '../../__mocks__';

import { registerCrawlerSitemapRoutes } from './crawler_sitemaps';

describe('crawler sitemap routes', () => {
  describe('POST /internal/app_search/engines/{engineName}/crawler/domains/{domainId}/sitemaps', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'post',
        path: '/internal/app_search/engines/{engineName}/crawler/domains/{domainId}/sitemaps',
      });

      registerCrawlerSitemapRoutes({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request to enterprise search', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/api/as/v1/engines/:engineName/crawler/domains/:domainId/sitemaps',
        params: {
          respond_with: 'index',
        },
      });
    });

    it('validates correctly with required params', () => {
      const request = {
        params: { engineName: 'some-engine', domainId: '1234' },
        body: {
          url: 'http://www.example.com/sitemaps.xml',
        },
      };
      mockRouter.shouldValidate(request);
    });

    it('fails otherwise', () => {
      const request = { params: {}, body: {} };
      mockRouter.shouldThrow(request);
    });
  });

  describe('PUT /internal/app_search/engines/{engineName}/crawler/domains/{domainId}/sitemaps/{sitemapId}', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'put',
        path: '/internal/app_search/engines/{engineName}/crawler/domains/{domainId}/sitemaps/{sitemapId}',
      });

      registerCrawlerSitemapRoutes({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request to enterprise search', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/api/as/v1/engines/:engineName/crawler/domains/:domainId/sitemaps/:sitemapId',
        params: {
          respond_with: 'index',
        },
      });
    });

    it('validates correctly with required params', () => {
      const request = {
        params: { engineName: 'some-engine', domainId: '1234', sitemapId: '5678' },
        body: {
          url: 'http://www.example.com/sitemaps.xml',
        },
      };
      mockRouter.shouldValidate(request);
    });

    it('fails otherwise', () => {
      const request = { params: {}, body: {} };
      mockRouter.shouldThrow(request);
    });
  });

  describe('DELETE /internal/app_search/engines/{engineName}/crawler/domains/{domainId}/sitemaps/{sitemapId}', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'delete',
        path: '/internal/app_search/engines/{engineName}/crawler/domains/{domainId}/sitemaps/{sitemapId}',
      });

      registerCrawlerSitemapRoutes({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request to enterprise search', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/api/as/v1/engines/:engineName/crawler/domains/:domainId/sitemaps/:sitemapId',
        params: {
          respond_with: 'index',
        },
      });
    });

    it('validates correctly with required params', () => {
      const request = {
        params: { engineName: 'some-engine', domainId: '1234', sitemapId: '5678' },
      };
      mockRouter.shouldValidate(request);
    });

    it('fails otherwise', () => {
      const request = { params: {} };
      mockRouter.shouldThrow(request);
    });
  });
});
