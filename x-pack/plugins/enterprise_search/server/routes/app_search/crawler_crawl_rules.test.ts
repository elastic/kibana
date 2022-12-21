/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockDependencies, mockRequestHandler, MockRouter } from '../../__mocks__';

import { registerCrawlerCrawlRulesRoutes } from './crawler_crawl_rules';

describe('crawler crawl rules routes', () => {
  describe('POST /internal/app_search/engines/{engineName}/crawler/domains/{domainId}/crawl_rules', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'post',
        path: '/internal/app_search/engines/{engineName}/crawler/domains/{domainId}/crawl_rules',
      });

      registerCrawlerCrawlRulesRoutes({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request to enterprise search', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/api/as/v1/engines/:engineName/crawler/domains/:domainId/crawl_rules',
        params: {
          respond_with: 'index',
        },
      });
    });

    it('validates correctly with required params', () => {
      const request = {
        params: { engineName: 'some-engine', domainId: '1234' },
        body: {
          pattern: '*',
          policy: 'allow',
          rule: 'begins',
        },
      };
      mockRouter.shouldValidate(request);
    });

    it('fails otherwise', () => {
      const request = { params: {}, body: {} };
      mockRouter.shouldThrow(request);
    });
  });

  describe('PUT /internal/app_search/engines/{engineName}/crawler/domains/{domainId}/crawl_rules/{crawlRuleId}', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'put',
        path: '/internal/app_search/engines/{engineName}/crawler/domains/{domainId}/crawl_rules/{crawlRuleId}',
      });

      registerCrawlerCrawlRulesRoutes({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request to enterprise search', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/api/as/v1/engines/:engineName/crawler/domains/:domainId/crawl_rules/:crawlRuleId',
        params: {
          respond_with: 'index',
        },
      });
    });

    it('validates correctly with required params', () => {
      const request = {
        params: { engineName: 'some-engine', domainId: '1234', crawlRuleId: '5678' },
        body: {
          order: 1,
          pattern: '*',
          policy: 'allow',
          rule: 'begins',
        },
      };
      mockRouter.shouldValidate(request);
    });

    it('fails otherwise', () => {
      const request = { params: {}, body: {} };
      mockRouter.shouldThrow(request);
    });
  });

  describe('DELETE /internal/app_search/engines/{engineName}/crawler/domains/{domainId}/crawl_rules/{crawlRuleId}', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'delete',
        path: '/internal/app_search/engines/{engineName}/crawler/domains/{domainId}/crawl_rules/{crawlRuleId}',
      });

      registerCrawlerCrawlRulesRoutes({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request to enterprise search', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/api/as/v1/engines/:engineName/crawler/domains/:domainId/crawl_rules/:crawlRuleId',
        params: {
          respond_with: 'index',
        },
      });
    });

    it('validates correctly with required params', () => {
      const request = {
        params: { engineName: 'some-engine', domainId: '1234', crawlRuleId: '5678' },
      };
      mockRouter.shouldValidate(request);
    });

    it('fails otherwise', () => {
      const request = { params: {} };
      mockRouter.shouldThrow(request);
    });
  });
});
