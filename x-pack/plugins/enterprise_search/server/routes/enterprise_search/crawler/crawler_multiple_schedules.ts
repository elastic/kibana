/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { i18n } from '@kbn/i18n';

import { ErrorCode } from '../../../../common/types/error_codes';

import { fetchCrawlerCustomSchedulingByIndexName } from '../../../lib/crawler/fetch_crawler_multiple_schedules';
import { postCrawlerCustomScheduling } from '../../../lib/crawler/post_crawler_multiple_schedules';
import { RouteDependencies } from '../../../plugin';
import { createError } from '../../../utils/create_error';
import { elasticsearchErrorHandler } from '../../../utils/elasticsearch_error_handler';

export function registerCrawlerMultipleSchedulesRoutes({ router, log }: RouteDependencies) {
  router.post(
    {
      path: '/internal/enterprise_search/indices/{indexName}/crawler/custom_scheduling',
      validate: {
        params: schema.object({
          indexName: schema.string(),
        }),
        body: schema.mapOf(
          schema.string(),
          schema.object({
            name: schema.string(),
            interval: schema.string(),
            enabled: schema.boolean(),
            configuration_overrides: schema.object({
              max_crawl_depth: schema.maybe(schema.number()),
              sitemap_discovery_disabled: schema.maybe(schema.boolean()),
              domain_allowlist: schema.maybe(schema.arrayOf(schema.string())),
              sitemap_urls: schema.maybe(schema.arrayOf(schema.string())),
              seed_urls: schema.maybe(schema.arrayOf(schema.string())),
            }),
          })
        ),
      },
    },
    elasticsearchErrorHandler(log, async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;
      const { params, body } = request;
      const postCustomSchedulingResult = await postCrawlerCustomScheduling(
        client,
        params.indexName,
        body
      );
      return response.ok({ postCustomSchedulingResult });
    })
  );

  router.get(
    {
      path: '/internal/enterprise_search/indices/{indexName}/crawler/custom_scheduling',
      validate: {
        params: schema.object({
          indexName: schema.string(),
        }),
      },
    },
    elasticsearchErrorHandler(log, async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;
      try {
        const { params } = request;
        const customScheduling = await fetchCrawlerCustomSchedulingByIndexName(
          client,
          params.indexName
        );
        return response.ok({
          body: customScheduling,
          headers: { 'content-type': 'application/json' },
        });
      } catch (error) {
        if ((error as Error).message === ErrorCode.DOCUMENT_NOT_FOUND) {
          return createError({
            errorCode: (error as Error).message as ErrorCode,
            message: i18n.translate(
              'xpack.enterpriseSearch.server.routes.fetchCrawlerMultipleSchedules.documentNotFoundError',
              {
                defaultMessage: 'Crawler data could not be found.',
              }
            ),
            response,
            statusCode: 404,
          });
        }

        throw error;
      }
    })
  );
}
