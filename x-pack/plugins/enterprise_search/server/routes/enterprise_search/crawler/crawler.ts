/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { RouteDependencies } from '../../../plugin';
import { elasticsearchErrorHandler } from '../../../utils/elasticsearch_error_handler';

import { registerCrawlerCrawlRulesRoutes } from './crawler_crawl_rules';
import { registerCrawlerEntryPointRoutes } from './crawler_entry_points';
import { registerCrawlerSitemapRoutes } from './crawler_sitemaps';

export function registerCrawlerRoutes(routeDependencies: RouteDependencies) {
  const { router, enterpriseSearchRequestHandler, log } = routeDependencies;

  router.put(
    {
      path: '/internal/enterprise_search/crawler/{indexName}',
      validate: {
        params: schema.object({
          indexName: schema.string(),
        }),
        body: schema.object({
          language: schema.oneOf([schema.string(), schema.literal(null)]),
        }),
      },
    },
    elasticsearchErrorHandler(log, async (context, request, response) => {
      return enterpriseSearchRequestHandler.createRequest({
        path: '/api/ent/v1/internal/indices/:indexName',
      })(context, request, response);
    })
  );

  router.post(
    {
      path: '/internal/enterprise_search/crawler/validate_url',
      validate: {
        body: schema.object({
          checks: schema.arrayOf(schema.string()),
          url: schema.string(),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/api/ent/v1/internal/crawler2/validate_url',
    })
  );

  router.get(
    {
      path: '/internal/enterprise_search/indices/{indexName}/crawler',
      validate: {
        params: schema.object({
          indexName: schema.string(),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/api/ent/v1/internal/indices/:indexName/crawler2',
    })
  );

  router.post(
    {
      path: '/internal/enterprise_search/indices/{indexName}/crawler/crawl_requests',
      validate: {
        body: schema.object({
          overrides: schema.maybe(
            schema.object({
              domain_allowlist: schema.maybe(schema.arrayOf(schema.string())),
              max_crawl_depth: schema.maybe(schema.number()),
              seed_urls: schema.maybe(schema.arrayOf(schema.string())),
              sitemap_discovery_disabled: schema.maybe(schema.boolean()),
              sitemap_urls: schema.maybe(schema.arrayOf(schema.string())),
            })
          ),
        }),
        params: schema.object({
          indexName: schema.string(),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/api/ent/v1/internal/indices/:indexName/crawler2/crawl_requests',
    })
  );

  router.post(
    {
      path: '/internal/enterprise_search/indices/{indexName}/crawler/crawl_requests/cancel',
      validate: {
        params: schema.object({
          indexName: schema.string(),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/api/ent/v1/internal/indices/:indexName/crawler2/crawl_requests/active/cancel',
    })
  );

  router.get(
    {
      path: '/internal/enterprise_search/indices/{indexName}/crawler/crawl_requests/{crawlRequestId}',
      validate: {
        params: schema.object({
          crawlRequestId: schema.string(),
          indexName: schema.string(),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/api/ent/v1/internal/indices/:indexName/crawler2/crawl_requests/:crawlRequestId',
    })
  );

  router.get(
    {
      path: '/internal/enterprise_search/indices/{indexName}/crawler/domains',
      validate: {
        params: schema.object({
          indexName: schema.string(),
        }),
        query: schema.object({
          'page[current]': schema.number(),
          'page[size]': schema.number(),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/api/ent/v1/internal/indices/:indexName/crawler2/domains',
    })
  );

  router.post(
    {
      path: '/internal/enterprise_search/indices/{indexName}/crawler/domains',
      validate: {
        body: schema.object({
          entry_points: schema.arrayOf(
            schema.object({
              value: schema.string(),
            })
          ),
          name: schema.string(),
        }),
        params: schema.object({
          indexName: schema.string(),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/api/ent/v1/internal/indices/:indexName/crawler2/domains',
    })
  );

  router.get(
    {
      path: '/internal/enterprise_search/indices/{indexName}/crawler/domains/{domainId}',
      validate: {
        params: schema.object({
          domainId: schema.string(),
          indexName: schema.string(),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/api/ent/v1/internal/indices/:indexName/crawler2/domains/:domainId',
    })
  );

  router.put(
    {
      path: '/internal/enterprise_search/indices/{indexName}/crawler/domains/{domainId}',
      validate: {
        body: schema.object({
          crawl_rules: schema.maybe(
            schema.arrayOf(
              schema.object({
                id: schema.string(),
                order: schema.number(),
              })
            )
          ),
          deduplication_enabled: schema.maybe(schema.boolean()),
          deduplication_fields: schema.maybe(schema.arrayOf(schema.string())),
        }),
        params: schema.object({
          domainId: schema.string(),
          indexName: schema.string(),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/api/ent/v1/internal/indices/:indexName/crawler2/domains/:domainId',
    })
  );

  router.delete(
    {
      path: '/internal/enterprise_search/indices/{indexName}/crawler/domains/{domainId}',
      validate: {
        params: schema.object({
          domainId: schema.string(),
          indexName: schema.string(),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/api/ent/v1/internal/indices/:indexName/crawler2/domains/:domainId',
    })
  );

  router.get(
    {
      path: '/internal/enterprise_search/indices/{indexName}/crawler/domain_configs',
      validate: {
        params: schema.object({
          indexName: schema.string(),
        }),
        query: schema.object({
          'page[current]': schema.maybe(schema.number()),
          'page[size]': schema.maybe(schema.number()),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/api/ent/v1/internal/indices/:indexName/crawler2/domain_configs',
    })
  );

  router.post(
    {
      path: '/internal/enterprise_search/indices/{indexName}/crawler/process_crawls',
      validate: {
        body: schema.object({
          domains: schema.maybe(schema.arrayOf(schema.string())),
        }),
        params: schema.object({
          indexName: schema.string(),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/api/ent/v1/internal/indices/:indexName/crawler2/process_crawls',
    })
  );

  router.get(
    {
      path: '/internal/enterprise_search/indices/{indexName}/crawler/crawl_schedule',
      validate: {
        params: schema.object({
          indexName: schema.string(),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/api/ent/v1/internal/indices/:indexName/crawler2/crawl_schedule',
    })
  );

  router.put(
    {
      path: '/internal/enterprise_search/indices/{indexName}/crawler/crawl_schedule',
      validate: {
        body: schema.object({
          frequency: schema.number(),
          unit: schema.string(),
        }),
        params: schema.object({
          indexName: schema.string(),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/api/ent/v1/internal/indices/:indexName/crawler2/crawl_schedule',
    })
  );

  router.delete(
    {
      path: '/internal/enterprise_search/indices/{indexName}/crawler/crawl_schedule',
      validate: {
        params: schema.object({
          indexName: schema.string(),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/api/ent/v1/internal/indices/:indexName/crawler2/crawl_schedule',
    })
  );

  registerCrawlerCrawlRulesRoutes(routeDependencies);
  registerCrawlerEntryPointRoutes(routeDependencies);
  registerCrawlerSitemapRoutes(routeDependencies);
}
