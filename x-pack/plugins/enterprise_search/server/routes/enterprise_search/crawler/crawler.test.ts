/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MockRouter, mockDependencies, mockRequestHandler } from '../../../__mocks__';

import { registerCrawlerRoutes } from './crawler';

describe('crawler routes', () => {
  describe('POST /internal/enterprise_search/crawler', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'post',
        path: '/internal/enterprise_search/crawler',
      });

      registerCrawlerRoutes({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('validates correctly with name and language', () => {
      const request = { body: { index_name: 'index-name', language: 'en' } };
      mockRouter.shouldValidate(request);
    });

    it('validates correctly when language is null', () => {
      const request = { body: { index_name: 'index-name', language: null } };
      mockRouter.shouldValidate(request);
    });

    it('fails validation without name', () => {
      const request = { body: { language: 'en' } };
      mockRouter.shouldThrow(request);
    });

    it('fails validation without language', () => {
      const request = { body: { index_name: 'index-name' } };
      mockRouter.shouldThrow(request);
    });
  });

  describe('GET /internal/enterprise_search/indices/{indexName}/crawler', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'get',
        path: '/internal/enterprise_search/indices/{indexName}/crawler',
      });

      registerCrawlerRoutes({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request to enterprise search', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/api/ent/v1/internal/indices/:indexName/crawler2',
      });
    });

    it('validates correctly with name', () => {
      const request = { params: { indexName: 'index-name' } };
      mockRouter.shouldValidate(request);
    });

    it('fails validation without name', () => {
      const request = { params: {} };
      mockRouter.shouldThrow(request);
    });
  });

  describe('GET /internal/enterprise_search/indices/{indexName}/crawler/crawl_requests/{crawlRequestId}', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'get',
        path: '/internal/enterprise_search/indices/{indexName}/crawler/crawl_requests/{crawlRequestId}',
      });

      registerCrawlerRoutes({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request to enterprise search', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/api/ent/v1/internal/indices/:indexName/crawler2/crawl_requests/:crawlRequestId',
      });
    });

    it('validates correctly with name and id', () => {
      const request = { params: { crawlRequestId: '12345', indexName: 'index-name' } };
      mockRouter.shouldValidate(request);
    });

    it('fails validation without name', () => {
      const request = { params: { crawlRequestId: '12345' } };
      mockRouter.shouldThrow(request);
    });

    it('fails validation without id', () => {
      const request = { params: { indexName: 'index-name' } };
      mockRouter.shouldThrow(request);
    });
  });

  describe('POST /internal/enterprise_search/indices/{indexName}/crawler/crawl_requests', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'post',
        path: '/internal/enterprise_search/indices/{indexName}/crawler/crawl_requests',
      });

      registerCrawlerRoutes({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request to enterprise search', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/api/ent/v1/internal/indices/:indexName/crawler2/crawl_requests',
      });
    });

    it('validates correctly with name', () => {
      const request = { params: { indexName: 'index-name' } };
      mockRouter.shouldValidate(request);
    });

    it('validates correctly with domain urls', () => {
      const request = {
        body: { overrides: { domain_allowlist: ['https://www.elastic.co'] } },
        params: { indexName: 'index-name' },
      };
      mockRouter.shouldValidate(request);
    });

    it('validates correctly with max crawl depth', () => {
      const request = {
        body: { overrides: { max_crawl_depth: 10 } },
        params: { indexName: 'index-name' },
      };
      mockRouter.shouldValidate(request);
    });

    it('validates correctly with seed urls', () => {
      const request = {
        body: { overrides: { seed_urls: ['https://www.elastic.co/guide'] } },
        params: { indexName: 'index-name' },
      };
      mockRouter.shouldValidate(request);
    });

    it('validates correctly with sitemap urls', () => {
      const request = {
        body: { overrides: { sitemap_urls: ['https://www.elastic.co/sitemap1.xml'] } },
        params: { indexName: 'index-name' },
      };
      mockRouter.shouldValidate(request);
    });

    it('validates correctly when we set sitemap discovery', () => {
      const request = {
        body: { overrides: { sitemap_discovery_disabled: true } },
        params: { indexName: 'index-name' },
      };
      mockRouter.shouldValidate(request);
    });

    it('validates correctly with empty overrides', () => {
      const request = { body: { overrides: {} }, params: { indexName: 'index-name' } };
      mockRouter.shouldValidate(request);
    });

    it('fails validation without name', () => {
      const request = { params: {} };
      mockRouter.shouldThrow(request);
    });
  });

  describe('GET /internal/enterprise_search/indices/{indexName}/crawler/domains', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'get',
        path: '/internal/enterprise_search/indices/{indexName}/crawler/domains',
      });

      registerCrawlerRoutes({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request to enterprise search', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/api/ent/v1/internal/indices/:indexName/crawler2/domains',
      });
    });

    it('validates correctly', () => {
      const request = {
        params: { indexName: 'index-name' },
        query: {
          'page[current]': 5,
          'page[size]': 10,
        },
      };
      mockRouter.shouldValidate(request);
    });

    it('fails validation without required params', () => {
      const request = { params: {} };
      mockRouter.shouldThrow(request);
    });
  });

  describe('POST /internal/enterprise_search/indices/{indexName}/crawler/crawl_requests/cancel', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'post',
        path: '/internal/enterprise_search/indices/{indexName}/crawler/crawl_requests/cancel',
      });

      registerCrawlerRoutes({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request to enterprise search', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/api/ent/v1/internal/indices/:indexName/crawler2/crawl_requests/active/cancel',
      });
    });

    it('validates correctly with name', () => {
      const request = { params: { indexName: 'index-name' } };
      mockRouter.shouldValidate(request);
    });

    it('fails validation without name', () => {
      const request = { params: {} };
      mockRouter.shouldThrow(request);
    });
  });

  describe('POST /internal/enterprise_search/indices/{indexName}/crawler/domains', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'post',
        path: '/internal/enterprise_search/indices/{indexName}/crawler/domains',
      });

      registerCrawlerRoutes({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request to enterprise search', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/api/ent/v1/internal/indices/:indexName/crawler2/domains',
      });
    });

    it('validates correctly with params and body', () => {
      const request = {
        body: { entry_points: [{ value: '/guide' }], name: 'https://elastic.co/guide' },
        params: { indexName: 'index-name' },
      };
      mockRouter.shouldValidate(request);
    });

    it('fails validation without a name param', () => {
      const request = {
        body: { entry_points: [{ value: '/guide' }], name: 'https://elastic.co/guide' },
        params: {},
      };
      mockRouter.shouldThrow(request);
    });

    it('fails validation without a body', () => {
      const request = {
        body: {},
        params: { indexName: 'index-name' },
      };
      mockRouter.shouldThrow(request);
    });
  });

  describe('DELETE /internal/enterprise_search/indices/{indexName}/crawler/domains/{domainId}', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'delete',
        path: '/internal/enterprise_search/indices/{indexName}/crawler/domains/{domainId}',
      });

      registerCrawlerRoutes({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request to enterprise search', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/api/ent/v1/internal/indices/:indexName/crawler2/domains/:domainId',
      });
    });

    it('validates correctly with name and id', () => {
      const request = { params: { domainId: '1234', indexName: 'index-name' } };
      mockRouter.shouldValidate(request);
    });

    it('fails validation without name', () => {
      const request = { params: { domainId: '1234' } };
      mockRouter.shouldThrow(request);
    });

    it('fails validation without id', () => {
      const request = { params: { indexName: 'index-name' } };
      mockRouter.shouldThrow(request);
    });
  });

  describe('PUT /internal/enterprise_search/indices/{indexName}/crawler/domains/{domainId}', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'put',
        path: '/internal/enterprise_search/indices/{indexName}/crawler/domains/{domainId}',
      });

      registerCrawlerRoutes({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request to enterprise search', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/api/ent/v1/internal/indices/:indexName/crawler2/domains/:domainId',
      });
    });

    it('validates correctly with crawl rules', () => {
      const request = {
        body: {
          crawl_rules: [
            {
              id: '5678',
              order: 1,
            },
          ],
        },
        params: { domainId: '1234', indexName: 'index-name' },
      };
      mockRouter.shouldValidate(request);
    });

    it('validates correctly with deduplication enabled', () => {
      const request = {
        body: {
          deduplication_enabled: true,
        },
        params: { domainId: '1234', indexName: 'index-name' },
      };
      mockRouter.shouldValidate(request);
    });

    it('validates correctly with deduplication fields', () => {
      const request = {
        body: {
          deduplication_fields: ['title', 'description'],
        },
        params: { domainId: '1234', indexName: 'index-name' },
      };
      mockRouter.shouldValidate(request);
    });
  });

  describe('GET /internal/enterprise_search/indices/{indexName}/crawler/domains/{domainId}', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'get',
        path: '/internal/enterprise_search/indices/{indexName}/crawler/domains/{domainId}',
      });

      registerCrawlerRoutes({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request to enterprise search', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/api/ent/v1/internal/indices/:indexName/crawler2/domains/:domainId',
      });
    });

    it('validates correctly with name and id', () => {
      const request = { params: { domainId: '1234', indexName: 'index-name' } };
      mockRouter.shouldValidate(request);
    });

    it('fails validation without name', () => {
      const request = { params: { domainId: '1234' } };
      mockRouter.shouldThrow(request);
    });

    it('fails validation without id', () => {
      const request = { params: { indexName: 'index-name' } };
      mockRouter.shouldThrow(request);
    });
  });

  describe('POST /internal/enterprise_search/crawler/validate_url', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'post',
        path: '/internal/enterprise_search/crawler/validate_url',
      });

      registerCrawlerRoutes({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request to enterprise search', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/api/ent/v1/internal/crawler2/validate_url',
      });
    });

    it('validates correctly with body', () => {
      const request = {
        body: { checks: ['tcp', 'url_request'], url: 'elastic.co' },
      };
      mockRouter.shouldValidate(request);
    });

    it('fails validation without a body', () => {
      const request = {
        body: {},
      };
      mockRouter.shouldThrow(request);
    });
  });

  describe('POST /internal/enterprise_search/indices/{indexName}/crawler/process_crawls', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'post',
        path: '/internal/enterprise_search/indices/{indexName}/crawler/process_crawls',
      });

      registerCrawlerRoutes({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request to enterprise search', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/api/ent/v1/internal/indices/:indexName/crawler2/process_crawls',
      });
    });

    it('validates correctly', () => {
      const request = {
        body: { domains: ['https://elastic.co', 'https://swiftype.com'] },
        params: { indexName: 'index-name' },
      };
      mockRouter.shouldValidate(request);
    });

    it('validates correctly without body', () => {
      const request = {
        body: {},
        params: { indexName: 'index-name' },
      };
      mockRouter.shouldValidate(request);
    });

    it('fails validation without a name param', () => {
      const request = {
        body: { domains: ['https://elastic.co', 'https://swiftype.com'] },
        params: {},
      };
      mockRouter.shouldThrow(request);
    });
  });

  describe('GET /internal/enterprise_search/indices/{indexName}/crawler/crawl_schedule', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'get',
        path: '/internal/enterprise_search/indices/{indexName}/crawler/crawl_schedule',
      });

      registerCrawlerRoutes({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request to enterprise search', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/api/ent/v1/internal/indices/:indexName/crawler2/crawl_schedule',
      });
    });

    it('validates correctly', () => {
      const request = {
        params: { indexName: 'index-name' },
      };
      mockRouter.shouldValidate(request);
    });

    it('fails validation without a name param', () => {
      const request = {
        params: {},
      };
      mockRouter.shouldThrow(request);
    });
  });

  describe('PUT /internal/enterprise_search/indices/{indexName}/crawler/crawl_schedule', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'put',
        path: '/internal/enterprise_search/indices/{indexName}/crawler/crawl_schedule',
      });

      registerCrawlerRoutes({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request to enterprise search', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/api/ent/v1/internal/indices/:indexName/crawler2/crawl_schedule',
      });
    });

    it('validates correctly', () => {
      const request = {
        body: { frequency: 7, unit: 'day', use_connector_schedule: true },
        params: { indexName: 'index-name' },
      };
      mockRouter.shouldValidate(request);
    });

    it('fails validation without a name param', () => {
      const request = {
        body: { frequency: 7, unit: 'day', use_connector_schedule: true },
        params: {},
      };
      mockRouter.shouldThrow(request);
    });

    it('fails validation without a unit property in body', () => {
      const request = {
        body: { frequency: 7, use_connector_schedule: true },
        params: { indexName: 'index-name' },
      };
      mockRouter.shouldThrow(request);
    });

    it('fails validation without a frequency property in body', () => {
      const request = {
        body: { unit: 'day', use_connector_schedule: true },
        params: { indexName: 'index-name' },
      };
      mockRouter.shouldThrow(request);
    });

    it('fails validation without a use_connector_schedule property in body', () => {
      const request = {
        body: { frequency: 7, unit: 'day' },
        params: { indexName: 'index-name' },
      };
      mockRouter.shouldThrow(request);
    });
  });

  describe('DELETE /internal/enterprise_search/indices/{indexName}/crawler/crawl_schedule', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'delete',
        path: '/internal/enterprise_search/indices/{indexName}/crawler/crawl_schedule',
      });

      registerCrawlerRoutes({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request to enterprise search', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/api/ent/v1/internal/indices/:indexName/crawler2/crawl_schedule',
      });
    });

    it('validates correctly', () => {
      const request = {
        params: { indexName: 'index-name' },
      };
      mockRouter.shouldValidate(request);
    });

    it('fails validation without a name param', () => {
      const request = {
        params: {},
      };
      mockRouter.shouldThrow(request);
    });
  });

  describe('GET /internal/enterprise_search/indices/{indexName}/crawler/domain_configs', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'get',
        path: '/internal/enterprise_search/indices/{indexName}/crawler/domain_configs',
      });

      registerCrawlerRoutes({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request to enterprise search', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/api/ent/v1/internal/indices/:indexName/crawler2/domain_configs',
      });
    });

    it('validates correctly with name', () => {
      const request = { params: { indexName: 'index-name' } };
      mockRouter.shouldValidate(request);
    });

    it('validates correctly with page[current]', () => {
      const request = { params: { indexName: 'index-name' }, query: { 'page[current]': 4 } };
      mockRouter.shouldValidate(request);
    });

    it('validates correctly with page[size]', () => {
      const request = { params: { indexName: 'index-name' }, query: { 'page[size]': 100 } };
      mockRouter.shouldValidate(request);
    });

    it('fails validation without name', () => {
      const request = { params: {} };
      mockRouter.shouldThrow(request);
    });
  });
});
