/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { RouteDependencies } from '../../../plugin';

const extractionRuleSchema = schema.object({
  extraction_rule: schema.object({
    description: schema.string(),
    rules: schema.arrayOf(
      schema.object({
        content_from: schema.object({
          value: schema.nullable(schema.string()),
          value_type: schema.string(),
        }),
        field_name: schema.string(),
        multiple_objects_handling: schema.string(),
        selector: schema.string(),
        source_type: schema.string(),
      })
    ),
    url_filters: schema.arrayOf(
      schema.object({ filter: schema.string(), pattern: schema.string() })
    ),
  }),
});

export function registerCrawlerExtractionRulesRoutes({
  router,
  enterpriseSearchRequestHandler,
}: RouteDependencies) {
  router.post(
    {
      path: '/internal/enterprise_search/indices/{indexName}/crawler/domains/{domainId}/extraction_rules',
      validate: {
        body: extractionRuleSchema,
        params: schema.object({
          domainId: schema.string(),
          indexName: schema.string(),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      params: {
        respond_with: 'index',
      },
      path: '/api/ent/v1/internal/indices/:indexName/crawler2/domains/:domainId/extraction_rules',
    })
  );

  router.put(
    {
      path: '/internal/enterprise_search/indices/{indexName}/crawler/domains/{domainId}/extraction_rules/{crawlRuleId}',
      validate: {
        body: extractionRuleSchema,
        params: schema.object({
          crawlRuleId: schema.string(),
          domainId: schema.string(),
          indexName: schema.string(),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      params: {
        respond_with: 'index',
      },
      path: '/api/ent/v1/internal/indices/:indexName/crawler2/domains/:domainId/extraction_rules/:crawlRuleId',
    })
  );

  router.delete(
    {
      path: '/internal/enterprise_search/indices/{indexName}/crawler/domains/{domainId}/extraction_rules/{crawlRuleId}',
      validate: {
        params: schema.object({
          crawlRuleId: schema.string(),
          domainId: schema.string(),
          indexName: schema.string(),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      params: {
        respond_with: 'index',
      },
      path: '/api/ent/v1/internal/indices/:indexName/crawler2/domains/:domainId/extraction_rules/:crawlRuleId',
    })
  );

  router.get(
    {
      path: '/internal/enterprise_search/indices/{indexName}/crawler/domains/{domainId}/extraction_rules/{crawlRuleId}',
      validate: {
        params: schema.object({
          crawlRuleId: schema.string(),
          domainId: schema.string(),
          indexName: schema.string(),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      params: {
        respond_with: 'index',
      },
      path: '/api/ent/v1/internal/indices/:indexName/crawler2/domains/:domainId/extraction_rules/:crawlRuleId',
    })
  );
}
