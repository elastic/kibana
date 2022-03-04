/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { RouteDependencies } from '../../plugin';

export function registerCrawlerRoutes({
  router,
  enterpriseSearchRequestHandler,
}: RouteDependencies) {
  router.get(
    {
      path: '/internal/app_search/engines/{name}/crawler',
      validate: {
        params: schema.object({
          name: schema.string(),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/api/as/v1/engines/:name/crawler',
    })
  );

  router.get(
    {
      path: '/internal/app_search/engines/{name}/crawler/crawl_requests',
      validate: {
        params: schema.object({
          name: schema.string(),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/api/as/v1/engines/:name/crawler/crawl_requests',
    })
  );

  router.get(
    {
      path: '/internal/app_search/engines/{name}/crawler/crawl_requests/{id}',
      validate: {
        params: schema.object({
          name: schema.string(),
          id: schema.string(),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/api/as/v1/engines/:name/crawler/crawl_requests/:id',
    })
  );

  router.post(
    {
      path: '/internal/app_search/engines/{name}/crawler/crawl_requests',
      validate: {
        params: schema.object({
          name: schema.string(),
        }),
        body: schema.object({
          overrides: schema.maybe(
            schema.object({
              domain_allowlist: schema.maybe(schema.arrayOf(schema.string())),
              max_crawl_depth: schema.maybe(schema.number()),
              seed_urls: schema.maybe(schema.arrayOf(schema.string())),
              sitemap_urls: schema.maybe(schema.arrayOf(schema.string())),
              sitemap_discovery_disabled: schema.maybe(schema.boolean()),
            })
          ),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/api/as/v1/engines/:name/crawler/crawl_requests',
    })
  );

  router.post(
    {
      path: '/internal/app_search/engines/{name}/crawler/crawl_requests/cancel',
      validate: {
        params: schema.object({
          name: schema.string(),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/api/as/v1/engines/:name/crawler/crawl_requests/active/cancel',
    })
  );

  router.get(
    {
      path: '/internal/app_search/engines/{name}/crawler/domains',
      validate: {
        params: schema.object({
          name: schema.string(),
        }),
        query: schema.object({
          'page[current]': schema.number(),
          'page[size]': schema.number(),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/api/as/v1/engines/:name/crawler/domains',
    })
  );

  router.post(
    {
      path: '/internal/app_search/engines/{name}/crawler/domains',
      validate: {
        params: schema.object({
          name: schema.string(),
        }),
        body: schema.object({
          name: schema.string(),
          entry_points: schema.arrayOf(
            schema.object({
              value: schema.string(),
            })
          ),
        }),
        query: schema.object({
          respond_with: schema.maybe(schema.string()),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/api/as/v1/engines/:name/crawler/domains',
    })
  );

  router.get(
    {
      path: '/internal/app_search/engines/{name}/crawler/domains/{id}',
      validate: {
        params: schema.object({
          name: schema.string(),
          id: schema.string(),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/api/as/v1/engines/:name/crawler/domains/:id',
    })
  );

  router.delete(
    {
      path: '/internal/app_search/engines/{name}/crawler/domains/{id}',
      validate: {
        params: schema.object({
          name: schema.string(),
          id: schema.string(),
        }),
        query: schema.object({
          respond_with: schema.maybe(schema.string()),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/api/as/v1/engines/:name/crawler/domains/:id',
    })
  );

  router.put(
    {
      path: '/internal/app_search/engines/{name}/crawler/domains/{id}',
      validate: {
        params: schema.object({
          name: schema.string(),
          id: schema.string(),
        }),
        body: schema.object({
          crawl_rules: schema.maybe(
            schema.arrayOf(
              schema.object({
                order: schema.number(),
                id: schema.string(),
              })
            )
          ),
          deduplication_enabled: schema.maybe(schema.boolean()),
          deduplication_fields: schema.maybe(schema.arrayOf(schema.string())),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/api/as/v1/engines/:name/crawler/domains/:id',
    })
  );

  router.post(
    {
      path: '/internal/app_search/crawler/validate_url',
      validate: {
        body: schema.object({
          url: schema.string(),
          checks: schema.arrayOf(schema.string()),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/api/as/v1/crawler/validate_url',
    })
  );

  router.post(
    {
      path: '/internal/app_search/engines/{name}/crawler/process_crawls',
      validate: {
        params: schema.object({
          name: schema.string(),
        }),
        body: schema.object({
          domains: schema.maybe(schema.arrayOf(schema.string())),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/api/as/v1/engines/:name/crawler/process_crawls',
    })
  );

  router.get(
    {
      path: '/internal/app_search/engines/{name}/crawler/crawl_schedule',
      validate: {
        params: schema.object({
          name: schema.string(),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/api/as/v1/engines/:name/crawler/crawl_schedule',
    })
  );

  router.put(
    {
      path: '/internal/app_search/engines/{name}/crawler/crawl_schedule',
      validate: {
        params: schema.object({
          name: schema.string(),
        }),
        body: schema.object({
          unit: schema.string(),
          frequency: schema.number(),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/api/as/v1/engines/:name/crawler/crawl_schedule',
    })
  );

  router.delete(
    {
      path: '/internal/app_search/engines/{name}/crawler/crawl_schedule',
      validate: {
        params: schema.object({
          name: schema.string(),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/api/as/v1/engines/:name/crawler/crawl_schedule',
    })
  );

  router.get(
    {
      path: '/internal/app_search/engines/{name}/crawler/domain_configs',
      validate: {
        params: schema.object({
          name: schema.string(),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/api/as/v1/engines/:name/crawler/domain_configs',
    })
  );
}
