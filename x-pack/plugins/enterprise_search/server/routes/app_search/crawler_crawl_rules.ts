/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { RouteDependencies } from '../../plugin';

export function registerCrawlerCrawlRulesRoutes({
  router,
  enterpriseSearchRequestHandler,
}: RouteDependencies) {
  router.post(
    {
      path: '/internal/app_search/engines/{engineName}/crawler/domains/{domainId}/crawl_rules',
      validate: {
        params: schema.object({
          engineName: schema.string(),
          domainId: schema.string(),
        }),
        body: schema.object({
          pattern: schema.string(),
          policy: schema.string(),
          rule: schema.string(),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/api/as/v1/engines/:engineName/crawler/domains/:domainId/crawl_rules',
      params: {
        respond_with: 'index',
      },
    })
  );

  router.put(
    {
      path: '/internal/app_search/engines/{engineName}/crawler/domains/{domainId}/crawl_rules/{crawlRuleId}',
      validate: {
        params: schema.object({
          engineName: schema.string(),
          domainId: schema.string(),
          crawlRuleId: schema.string(),
        }),
        body: schema.object({
          order: schema.number(),
          pattern: schema.string(),
          policy: schema.string(),
          rule: schema.string(),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/api/as/v1/engines/:engineName/crawler/domains/:domainId/crawl_rules/:crawlRuleId',
      params: {
        respond_with: 'index',
      },
    })
  );

  router.delete(
    {
      path: '/internal/app_search/engines/{engineName}/crawler/domains/{domainId}/crawl_rules/{crawlRuleId}',
      validate: {
        params: schema.object({
          engineName: schema.string(),
          domainId: schema.string(),
          crawlRuleId: schema.string(),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/api/as/v1/engines/:engineName/crawler/domains/:domainId/crawl_rules/:crawlRuleId',
      params: {
        respond_with: 'index',
      },
    })
  );
}
