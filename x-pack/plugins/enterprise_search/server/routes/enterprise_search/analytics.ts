/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { KibanaResponseFactory } from '@kbn/core-http-server';
import { i18n } from '@kbn/i18n';

import { ErrorCode } from '../../../common/types/error_codes';
import { addAnalyticsCollection } from '../../lib/analytics/add_analytics_collection';
import { deleteAnalyticsCollectionByName } from '../../lib/analytics/delete_analytics_collection';
import {
  fetchAnalyticsCollectionByName,
  fetchAnalyticsCollections,
} from '../../lib/analytics/fetch_analytics_collection';
import { RouteDependencies } from '../../plugin';
import { createError } from '../../utils/create_error';
import { elasticsearchErrorHandler } from '../../utils/elasticsearch_error_handler';

const createIndexNotFoundError = (error: Error, response: KibanaResponseFactory) => {
  return createError({
    errorCode: error.message as ErrorCode,
    message: i18n.translate(
      'xpack.enterpriseSearch.server.routes.addAnalyticsCollection.analyticsCollectionNotFoundErrorMessage',
      {
        defaultMessage: 'Analytics collection not found',
      }
    ),
    response,
    statusCode: 404,
  });
};

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

  router.get(
    {
      path: '/internal/enterprise_search/analytics/collections/{collection_name}',
      validate: {
        params: schema.object({
          collection_name: schema.string(),
        }),
      },
    },
    elasticsearchErrorHandler(log, async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;

      try {
        const collection = await fetchAnalyticsCollectionByName(
          client,
          request.params.collection_name
        );

        if (!collection) {
          throw new Error(ErrorCode.ANALYTICS_COLLECTION_NOT_FOUND);
        }

        return response.ok({ body: collection });
      } catch (error) {
        if ((error as Error).message === ErrorCode.ANALYTICS_COLLECTION_NOT_FOUND) {
          return createIndexNotFoundError(error, response);
        }

        throw error;
      }
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

  router.delete(
    {
      path: '/internal/enterprise_search/analytics/collections/{collection_name}',
      validate: {
        params: schema.object({
          collection_name: schema.string(),
        }),
      },
    },
    elasticsearchErrorHandler(log, async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;
      try {
        await deleteAnalyticsCollectionByName(client, request.params.collection_name);
        return response.ok();
      } catch (error) {
        if ((error as Error).message === ErrorCode.ANALYTICS_COLLECTION_NOT_FOUND) {
          return createIndexNotFoundError(error, response);
        }
        throw error;
      }
    })
  );
}
