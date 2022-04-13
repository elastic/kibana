/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { RouteDependencies } from '../../plugin';

export function registerCrawlerSitemapRoutes({
  router,
  enterpriseSearchRequestHandler,
}: RouteDependencies) {
  router.post(
    {
      path: '/internal/app_search/engines/{engineName}/crawler/domains/{domainId}/sitemaps',
      validate: {
        params: schema.object({
          engineName: schema.string(),
          domainId: schema.string(),
        }),
        body: schema.object({
          url: schema.string(),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/api/as/v1/engines/:engineName/crawler/domains/:domainId/sitemaps',
      params: {
        respond_with: 'index',
      },
    })
  );

  router.put(
    {
      path: '/internal/app_search/engines/{engineName}/crawler/domains/{domainId}/sitemaps/{sitemapId}',
      validate: {
        params: schema.object({
          engineName: schema.string(),
          domainId: schema.string(),
          sitemapId: schema.string(),
        }),
        body: schema.object({
          url: schema.string(),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/api/as/v1/engines/:engineName/crawler/domains/:domainId/sitemaps/:sitemapId',
      params: {
        respond_with: 'index',
      },
    })
  );

  router.delete(
    {
      path: '/internal/app_search/engines/{engineName}/crawler/domains/{domainId}/sitemaps/{sitemapId}',
      validate: {
        params: schema.object({
          engineName: schema.string(),
          domainId: schema.string(),
          sitemapId: schema.string(),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/api/as/v1/engines/:engineName/crawler/domains/:domainId/sitemaps/:sitemapId',
      params: {
        respond_with: 'index',
      },
    })
  );
}
