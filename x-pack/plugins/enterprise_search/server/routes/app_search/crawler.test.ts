/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockDependencies, mockRequestHandler, MockRouter } from '../../__mocks__';

import { registerCrawlerRoutes } from './crawler';

describe('crawler routes', () => {
  describe('GET /internal/app_search/engines/{name}/crawler', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'get',
        path: '/internal/app_search/engines/{name}/crawler',
      });

      registerCrawlerRoutes({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request to enterprise search', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/api/as/v1/engines/:name/crawler',
      });
    });

    it('validates correctly with name', () => {
      const request = { params: { name: 'some-engine' } };
      mockRouter.shouldValidate(request);
    });

    it('fails validation without name', () => {
      const request = { params: {} };
      mockRouter.shouldThrow(request);
    });
  });

  describe('GET /internal/app_search/engines/{name}/crawler/crawl_requests', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'get',
        path: '/internal/app_search/engines/{name}/crawler/crawl_requests',
      });

      registerCrawlerRoutes({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request to enterprise search', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/api/as/v1/engines/:name/crawler/crawl_requests',
      });
    });

    it('validates correctly with name', () => {
      const request = { params: { name: 'some-engine' } };
      mockRouter.shouldValidate(request);
    });

    it('fails validation without name', () => {
      const request = { params: {} };
      mockRouter.shouldThrow(request);
    });
  });

  describe('GET /internal/app_search/engines/{name}/crawler/crawl_requests/{id}', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'get',
        path: '/internal/app_search/engines/{name}/crawler/crawl_requests/{id}',
      });

      registerCrawlerRoutes({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request to enterprise search', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/api/as/v1/engines/:name/crawler/crawl_requests/:id',
      });
    });

    it('validates correctly with name and id', () => {
      const request = { params: { name: 'some-engine', id: '12345' } };
      mockRouter.shouldValidate(request);
    });

    it('fails validation without name', () => {
      const request = { params: { id: '12345' } };
      mockRouter.shouldThrow(request);
    });

    it('fails validation without id', () => {
      const request = { params: { name: 'some-engine' } };
      mockRouter.shouldThrow(request);
    });
  });

  describe('POST /internal/app_search/engines/{name}/crawler/crawl_requests', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'post',
        path: '/internal/app_search/engines/{name}/crawler/crawl_requests',
      });

      registerCrawlerRoutes({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request to enterprise search', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/api/as/v1/engines/:name/crawler/crawl_requests',
      });
    });

    it('validates correctly with name', () => {
      const request = { params: { name: 'some-engine' } };
      mockRouter.shouldValidate(request);
    });

    it('validates correctly with domain urls', () => {
      const request = {
        params: { name: 'some-engine' },
        body: { overrides: { domain_allowlist: ['https://www.elastic.co'] } },
      };
      mockRouter.shouldValidate(request);
    });

    it('validates correctly with max crawl depth', () => {
      const request = {
        params: { name: 'some-engine' },
        body: { overrides: { max_crawl_depth: 10 } },
      };
      mockRouter.shouldValidate(request);
    });

    it('validates correctly with seed urls', () => {
      const request = {
        params: { name: 'some-engine' },
        body: { overrides: { seed_urls: ['https://www.elastic.co/guide'] } },
      };
      mockRouter.shouldValidate(request);
    });

    it('validates correctly with sitemap urls', () => {
      const request = {
        params: { name: 'some-engine' },
        body: { overrides: { sitemap_urls: ['https://www.elastic.co/sitemap1.xml'] } },
      };
      mockRouter.shouldValidate(request);
    });

    it('validates correctly when we set sitemap discovery', () => {
      const request = {
        params: { name: 'some-engine' },
        body: { overrides: { sitemap_discovery_disabled: true } },
      };
      mockRouter.shouldValidate(request);
    });

    it('validates correctly with empty overrides', () => {
      const request = { params: { name: 'some-engine' }, body: { overrides: {} } };
      mockRouter.shouldValidate(request);
    });

    it('fails validation without name', () => {
      const request = { params: {} };
      mockRouter.shouldThrow(request);
    });
  });

  describe('GET /internal/app_search/engines/{name}/crawler/domains', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'get',
        path: '/internal/app_search/engines/{name}/crawler/domains',
      });

      registerCrawlerRoutes({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request to enterprise search', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/api/as/v1/engines/:name/crawler/domains',
      });
    });

    it('validates correctly', () => {
      const request = {
        params: { name: 'some-engine' },
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

  describe('POST /internal/app_search/engines/{name}/crawler/crawl_requests/cancel', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'post',
        path: '/internal/app_search/engines/{name}/crawler/crawl_requests/cancel',
      });

      registerCrawlerRoutes({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request to enterprise search', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/api/as/v1/engines/:name/crawler/crawl_requests/active/cancel',
      });
    });

    it('validates correctly with name', () => {
      const request = { params: { name: 'some-engine' } };
      mockRouter.shouldValidate(request);
    });

    it('fails validation without name', () => {
      const request = { params: {} };
      mockRouter.shouldThrow(request);
    });
  });

  describe('POST /internal/app_search/engines/{name}/crawler/domains', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'post',
        path: '/internal/app_search/engines/{name}/crawler/domains',
      });

      registerCrawlerRoutes({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request to enterprise search', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/api/as/v1/engines/:name/crawler/domains',
      });
    });

    it('validates correctly with params and body', () => {
      const request = {
        params: { name: 'some-engine' },
        body: { name: 'https://elastic.co/guide', entry_points: [{ value: '/guide' }] },
      };
      mockRouter.shouldValidate(request);
    });

    it('accepts a query param', () => {
      const request = {
        params: { name: 'some-engine' },
        body: { name: 'https://elastic.co/guide', entry_points: [{ value: '/guide' }] },
        query: { respond_with: 'crawler_details' },
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
        params: { name: 'some-engine' },
        body: {},
      };
      mockRouter.shouldThrow(request);
    });
  });

  describe('DELETE /internal/app_search/engines/{name}/crawler/domains/{id}', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'delete',
        path: '/internal/app_search/engines/{name}/crawler/domains/{id}',
      });

      registerCrawlerRoutes({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request to enterprise search', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/api/as/v1/engines/:name/crawler/domains/:id',
      });
    });

    it('validates correctly with name and id', () => {
      const request = { params: { name: 'some-engine', id: '1234' } };
      mockRouter.shouldValidate(request);
    });

    it('fails validation without name', () => {
      const request = { params: { id: '1234' } };
      mockRouter.shouldThrow(request);
    });

    it('fails validation without id', () => {
      const request = { params: { name: 'test-engine' } };
      mockRouter.shouldThrow(request);
    });

    it('accepts a query param', () => {
      const request = {
        params: { name: 'test-engine', id: '1234' },
        query: { respond_with: 'crawler_details' },
      };
      mockRouter.shouldValidate(request);
    });
  });

  describe('PUT /internal/app_search/engines/{name}/crawler/domains/{id}', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'put',
        path: '/internal/app_search/engines/{name}/crawler/domains/{id}',
      });

      registerCrawlerRoutes({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request to enterprise search', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/api/as/v1/engines/:name/crawler/domains/:id',
      });
    });

    it('validates correctly with crawl rules', () => {
      const request = {
        params: { name: 'some-engine', id: '1234' },
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
        params: { name: 'some-engine', id: '1234' },
        body: {
          deduplication_enabled: true,
        },
      };
      mockRouter.shouldValidate(request);
    });

    it('validates correctly with deduplication fields', () => {
      const request = {
        params: { name: 'some-engine', id: '1234' },
        body: {
          deduplication_fields: ['title', 'description'],
        },
      };
      mockRouter.shouldValidate(request);
    });
  });

  describe('GET /internal/app_search/engines/{name}/crawler/domains/{id}', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'get',
        path: '/internal/app_search/engines/{name}/crawler/domains/{id}',
      });

      registerCrawlerRoutes({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request to enterprise search', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/api/as/v1/engines/:name/crawler/domains/:id',
      });
    });

    it('validates correctly with name and id', () => {
      const request = { params: { name: 'some-engine', id: '1234' } };
      mockRouter.shouldValidate(request);
    });

    it('fails validation without name', () => {
      const request = { params: { id: '1234' } };
      mockRouter.shouldThrow(request);
    });

    it('fails validation without id', () => {
      const request = { params: { name: 'test-engine' } };
      mockRouter.shouldThrow(request);
    });
  });

  describe('POST /internal/app_search/crawler/validate_url', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'post',
        path: '/internal/app_search/crawler/validate_url',
      });

      registerCrawlerRoutes({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request to enterprise search', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/api/as/v1/crawler/validate_url',
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

  describe('POST /internal/app_search/engines/{name}/crawler/process_crawls', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'post',
        path: '/internal/app_search/engines/{name}/crawler/process_crawls',
      });

      registerCrawlerRoutes({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request to enterprise search', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/api/as/v1/engines/:name/crawler/process_crawls',
      });
    });

    it('validates correctly', () => {
      const request = {
        params: { name: 'some-engine' },
        body: { domains: ['https://elastic.co', 'https://swiftype.com'] },
      };
      mockRouter.shouldValidate(request);
    });

    it('validates correctly without body', () => {
      const request = {
        params: { name: 'some-engine' },
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

  describe('GET /internal/app_search/engines/{name}/crawler/crawl_schedule', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'get',
        path: '/internal/app_search/engines/{name}/crawler/crawl_schedule',
      });

      registerCrawlerRoutes({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request to enterprise search', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/api/as/v1/engines/:name/crawler/crawl_schedule',
      });
    });

    it('validates correctly', () => {
      const request = {
        params: { name: 'some-engine' },
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

  describe('PUT /internal/app_search/engines/{name}/crawler/crawl_schedule', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'put',
        path: '/internal/app_search/engines/{name}/crawler/crawl_schedule',
      });

      registerCrawlerRoutes({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request to enterprise search', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/api/as/v1/engines/:name/crawler/crawl_schedule',
      });
    });

    it('validates correctly', () => {
      const request = {
        params: { name: 'some-engine' },
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
        params: { name: 'some-engine' },
        body: { frequency: 7 },
      };
      mockRouter.shouldThrow(request);
    });

    it('fails validation without a frequency property in body', () => {
      const request = {
        params: { name: 'some-engine' },
        body: { unit: 'day' },
      };
      mockRouter.shouldThrow(request);
    });
  });

  describe('DELETE /internal/app_search/engines/{name}/crawler/crawl_schedule', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'delete',
        path: '/internal/app_search/engines/{name}/crawler/crawl_schedule',
      });

      registerCrawlerRoutes({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request to enterprise search', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/api/as/v1/engines/:name/crawler/crawl_schedule',
      });
    });

    it('validates correctly', () => {
      const request = {
        params: { name: 'some-engine' },
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

  describe('GET /internal/app_search/engines/{name}/crawler/domain_configs', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'get',
        path: '/internal/app_search/engines/{name}/crawler/domain_configs',
      });

      registerCrawlerRoutes({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request to enterprise search', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/api/as/v1/engines/:name/crawler/domain_configs',
      });
    });

    it('validates correctly with name', () => {
      const request = { params: { name: 'some-engine' } };
      mockRouter.shouldValidate(request);
    });

    it('fails validation without name', () => {
      const request = { params: {} };
      mockRouter.shouldThrow(request);
    });
  });
});
