/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { i18n } from '@kbn/i18n';

import { ErrorCode } from '../../../common/types/error_codes';
import { addAnalyticsCollection } from '../../lib/analytics/add_analytics_collection';
import { fetchAnalyticsCollections } from '../../lib/analytics/fetch_analytics_collection';
import { RouteDependencies } from '../../plugin';
import { createError } from '../../utils/create_error';
import { elasticsearchErrorHandler } from '../../utils/elasticsearch_error_handler';

export function registerAnalyticsRoutes({ router, log }: RouteDependencies) {
  router.get(
    {
      path: '/internal/enterprise_search/analytics/collections',
      validate: {},
    },
    elasticsearchErrorHandler(log, async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;
      const collections = await fetchAnalyticsCollections(client);
      return response.ok({ body: collections });
    })
  );

  router.post(
    {
      path: '/internal/enterprise_search/analytics/collections',
      validate: {
        body: schema.object({
          name: schema.string(),
        }),
      },
    },
    elasticsearchErrorHandler(log, async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;
      try {
        const body = await addAnalyticsCollection(client, request.body);
        return response.ok({ body });
      } catch (error) {
        if ((error as Error).message === ErrorCode.ANALYTICS_COLLECTION_ALREADY_EXISTS) {
          return createError({
            errorCode: (error as Error).message as ErrorCode,
            message: i18n.translate(
              'xpack.enterpriseSearch.server.routes.addAnalyticsCollection.analyticsCollectionExistsError',
              {
                defaultMessage: 'Analytics collection already exists',
              }
            ),
            response,
            statusCode: 409,
          });
        }
        throw error;
      }
    })
  );
}
