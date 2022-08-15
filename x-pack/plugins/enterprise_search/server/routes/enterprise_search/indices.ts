/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { i18n } from '@kbn/i18n';

import { ErrorCode } from '../../../common/types/error_codes';

import { fetchConnectorByIndexName, fetchConnectors } from '../../lib/connectors/fetch_connectors';
import { fetchCrawlerByIndexName, fetchCrawlers } from '../../lib/crawler/fetch_crawlers';

import { createApiIndex } from '../../lib/indices/create_index';
import { fetchIndex } from '../../lib/indices/fetch_index';
import { fetchIndices } from '../../lib/indices/fetch_indices';
import { generateApiKey } from '../../lib/indices/generate_api_key';
import { RouteDependencies } from '../../plugin';
import { createError } from '../../utils/create_error';
import { elasticsearchErrorHandler } from '../../utils/elasticsearch_error_handler';
import { isIndexNotFoundException } from '../../utils/identify_exceptions';

export function registerIndexRoutes({ router, log }: RouteDependencies) {
  router.get(
    { path: '/internal/enterprise_search/search_indices', validate: false },
    elasticsearchErrorHandler(log, async (context, _, response) => {
      const { client } = (await context.core).elasticsearch;
      const indices = await fetchIndices(client, '*', false, true, 'search-');

      return response.ok({
        body: indices,
        headers: { 'content-type': 'application/json' },
      });
    })
  );

  router.get(
    {
      path: '/internal/enterprise_search/indices',
      validate: {
        query: schema.object({
          page: schema.number({ defaultValue: 0, min: 0 }),
          return_hidden_indices: schema.maybe(schema.boolean()),
          search_query: schema.maybe(schema.string()),
          size: schema.number({ defaultValue: 10, min: 0 }),
        }),
      },
    },
    elasticsearchErrorHandler(log, async (context, request, response) => {
      const {
        page,
        size,
        return_hidden_indices: returnHiddenIndices,
        search_query: searchQuery,
      } = request.query;
      const { client } = (await context.core).elasticsearch;

      const indexPattern = searchQuery ? `*${searchQuery}*` : '*';
      const totalIndices = await fetchIndices(client, indexPattern, !!returnHiddenIndices, false);
      const totalResults = totalIndices.length;
      const totalPages = Math.ceil(totalResults / size) || 1;
      const startIndex = (page - 1) * size;
      const endIndex = page * size;
      const selectedIndices = totalIndices.slice(startIndex, endIndex);
      const indexNames = selectedIndices.map(({ name }) => name);
      const connectors = await fetchConnectors(client, indexNames);
      const crawlers = await fetchCrawlers(client, indexNames);
      const indices = selectedIndices.map((index) => ({
        ...index,
        connector: connectors.find((connector) => connector.index_name === index.name),
        crawler: crawlers.find((crawler) => crawler.index_name === index.name),
      }));

      return response.ok({
        body: {
          indices,
          meta: {
            page: {
              current: page,
              size: indices.length,
              total_pages: totalPages,
              total_results: totalResults,
            },
          },
        },
        headers: { 'content-type': 'application/json' },
      });
    })
  );

  router.get(
    {
      path: '/internal/enterprise_search/indices/{indexName}',
      validate: {
        params: schema.object({
          indexName: schema.string(),
        }),
      },
    },
    elasticsearchErrorHandler(log, async (context, request, response) => {
      const indexName = decodeURIComponent(request.params.indexName);
      const { client } = (await context.core).elasticsearch;

      try {
        const index = await fetchIndex(client, indexName);
        return response.ok({
          body: index,
          headers: { 'content-type': 'application/json' },
        });
      } catch (error) {
        if (isIndexNotFoundException(error)) {
          return createError({
            errorCode: ErrorCode.INDEX_NOT_FOUND,
            message: 'Could not find index',
            response,
            statusCode: 404,
          });
        }

        throw error;
      }
    })
  );

  router.get(
    {
      path: '/internal/enterprise_search/indices/{indexName}/exists',
      validate: {
        params: schema.object({
          indexName: schema.string(),
        }),
      },
    },
    elasticsearchErrorHandler(log, async (context, request, response) => {
      const indexName = decodeURIComponent(request.params.indexName);
      const { client } = (await context.core).elasticsearch;
      let indexExists: boolean;

      try {
        indexExists = await client.asCurrentUser.indices.exists({ index: indexName });
      } catch (e) {
        log.warn(
          i18n.translate('xpack.enterpriseSearch.server.routes.indices.existsErrorLogMessage', {
            defaultMessage: 'An error occured while resolving request to {requestUrl}',
            values: {
              requestUrl: request.url.toString(),
            },
          })
        );
        log.warn(e);
        indexExists = false;
      }

      return response.ok({
        body: {
          exists: indexExists,
        },
        headers: { 'content-type': 'application/json' },
      });
    })
  );

  router.post(
    {
      path: '/internal/enterprise_search/indices/{indexName}/api_key',
      validate: {
        params: schema.object({
          indexName: schema.string(),
        }),
      },
    },
    elasticsearchErrorHandler(log, async (context, request, response) => {
      const indexName = decodeURIComponent(request.params.indexName);
      const { client } = (await context.core).elasticsearch;

      const apiKey = await generateApiKey(client, indexName);

      return response.ok({
        body: apiKey,
        headers: { 'content-type': 'application/json' },
      });
    })
  );

  router.post(
    {
      path: '/internal/enterprise_search/indices',
      validate: {
        body: schema.object({
          index_name: schema.string(),
          language: schema.maybe(schema.nullable(schema.string())),
        }),
      },
    },
    elasticsearchErrorHandler(log, async (context, request, response) => {
      const { ['index_name']: indexName, language } = request.body;
      const { client } = (await context.core).elasticsearch;

      const indexExists = await client.asCurrentUser.indices.exists({
        index: request.body.index_name,
      });

      if (indexExists) {
        return createError({
          errorCode: ErrorCode.INDEX_ALREADY_EXISTS,
          message: i18n.translate(
            'xpack.enterpriseSearch.server.routes.createApiIndex.indexExistsError',
            {
              defaultMessage: 'This index already exists',
            }
          ),
          response,
          statusCode: 409,
        });
      }

      const crawler = await fetchCrawlerByIndexName(client, request.body.index_name);

      if (crawler) {
        return createError({
          errorCode: ErrorCode.CRAWLER_ALREADY_EXISTS,
          message: i18n.translate(
            'xpack.enterpriseSearch.server.routes.createApiIndex.crawlerExistsError',
            {
              defaultMessage: 'A crawler for this index already exists',
            }
          ),
          response,
          statusCode: 409,
        });
      }

      const connector = await fetchConnectorByIndexName(client, request.body.index_name);

      if (connector) {
        return createError({
          errorCode: ErrorCode.CONNECTOR_DOCUMENT_ALREADY_EXISTS,
          message: i18n.translate(
            'xpack.enterpriseSearch.server.routes.createApiIndex.connectorExistsError',
            {
              defaultMessage: 'A connector for this index already exists',
            }
          ),
          response,
          statusCode: 409,
        });
      }

      const createIndexResponse = await createApiIndex(client, indexName, language);

      return response.ok({
        body: createIndexResponse,
        headers: { 'content-type': 'application/json' },
      });
    })
  );
}
