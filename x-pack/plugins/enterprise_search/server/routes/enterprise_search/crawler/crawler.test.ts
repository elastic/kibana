/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MockRouter, mockDependencies, mockRequestHandler } from '../../../__mocks__';

import { registerCrawlerRoutes } from './crawler';

describe('crawler routes', () => {
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
      const request = { params: { indexName: 'index-name', crawlRequestId: '12345' } };
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
        params: { indexName: 'index-name' },
        body: { overrides: { domain_allowlist: ['https://www.elastic.co'] } },
      };
      mockRouter.shouldValidate(request);
    });

    it('validates correctly with max crawl depth', () => {
      const request = {
        params: { indexName: 'index-name' },
        body: { overrides: { max_crawl_depth: 10 } },
      };
      mockRouter.shouldValidate(request);
    });

    it('validates correctly with seed urls', () => {
      const request = {
        params: { indexName: 'index-name' },
        body: { overrides: { seed_urls: ['https://www.elastic.co/guide'] } },
      };
      mockRouter.shouldValidate(request);
    });

    it('validates correctly with sitemap urls', () => {
      const request = {
        params: { indexName: 'index-name' },
        body: { overrides: { sitemap_urls: ['https://www.elastic.co/sitemap1.xml'] } },
      };
      mockRouter.shouldValidate(request);
    });

    it('validates correctly when we set sitemap discovery', () => {
      const request = {
        params: { indexName: 'index-name' },
        body: { overrides: { sitemap_discovery_disabled: true } },
      };
      mockRouter.shouldValidate(request);
    });

    it('validates correctly with empty overrides', () => {
      const request = { params: { indexName: 'index-name' }, body: { overrides: {} } };
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
        params: { indexName: 'index-name' },
        body: { name: 'https://elastic.co/guide', entry_points: [{ value: '/guide' }] },
      };
      mockRouter.shouldValidate(request);
    });

    it('fails validation without a name param', () => {
      const request = {
        params: {},
        body: { name: 'https://elastic.co/guide', entry_points: [{ value: '/guide' }] },
      };
      mockRouter.shouldThrow(request);
    });

    it('fails validation without a body', () => {
      const request = {
        params: { indexName: 'index-name' },
        body: {},
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
      const request = { params: { indexName: 'index-name', domainId: '1234' } };
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
        params: { indexName: 'index-name', domainId: '1234' },
        body: {
          crawl_rules: [
            {
              order: 1,
              id: '5678',
            },
          ],
        },
      };
      mockRouter.shouldValidate(request);
    });

    it('validates correctly with deduplication enabled', () => {
      const request = {
        params: { indexName: 'index-name', domainId: '1234' },
        body: {
          deduplication_enabled: true,
        },
      };
      mockRouter.shouldValidate(request);
    });

    it('validates correctly with deduplication fields', () => {
      const request = {
        params: { indexName: 'index-name', domainId: '1234' },
        body: {
          deduplication_fields: ['title', 'description'],
        },
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
      const request = { params: { indexName: 'index-name', domainId: '1234' } };
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
        path: '/api/ent/v1/internal/crawler/validate_url',
      });
    });

    it('validates correctly with body', () => {
      const request = {
        body: { url: 'elastic.co', checks: ['tcp', 'url_request'] },
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
        params: { indexName: 'index-name' },
        body: { domains: ['https://elastic.co', 'https://swiftype.com'] },
      };
      mockRouter.shouldValidate(request);
    });

    it('validates correctly without body', () => {
      const request = {
        params: { indexName: 'index-name' },
        body: {},
      };
      mockRouter.shouldValidate(request);
    });

    it('fails validation without a name param', () => {
      const request = {
        params: {},
        body: { domains: ['https://elastic.co', 'https://swiftype.com'] },
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
        params: { indexName: 'index-name' },
        body: { unit: 'day', frequency: 7 },
      };
      mockRouter.shouldValidate(request);
    });

    it('fails validation without a name param', () => {
      const request = {
        params: {},
        body: { unit: 'day', frequency: 7 },
      };
      mockRouter.shouldThrow(request);
    });

    it('fails validation without a unit property in body', () => {
      const request = {
        params: { indexName: 'index-name' },
        body: { frequency: 7 },
      };
      mockRouter.shouldThrow(request);
    });

    it('fails validation without a frequency property in body', () => {
      const request = {
        params: { indexName: 'index-name' },
        body: { unit: 'day' },
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

    it('fails validation without name', () => {
      const request = { params: {} };
      mockRouter.shouldThrow(request);
    });
  });
});
