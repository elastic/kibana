/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { SearchResponse, AcknowledgedResponseBase } from '@elastic/elasticsearch/lib/api/types';
import { schema } from '@kbn/config-schema';

import {
  EnterpriseSearchEngineDetails,
  EnterpriseSearchEnginesResponse,
  EnterpriseSearchEngineUpsertResponse,
} from '../../../common/types/engines';
import { ErrorCode } from '../../../common/types/error_codes';
import { createApiKey } from '../../lib/engines/create_api_key';

import { fetchEngineFieldCapabilities } from '../../lib/engines/field_capabilities';
import { RouteDependencies } from '../../plugin';

import { createError } from '../../utils/create_error';
import { elasticsearchErrorHandler } from '../../utils/elasticsearch_error_handler';
import { fetchEnterpriseSearch, isResponseError } from '../../utils/fetch_enterprise_search';

export function registerEnginesRoutes({ config, log, router }: RouteDependencies) {
  router.get(
    {
      path: '/internal/enterprise_search/engines',
      validate: {
        query: schema.object({
          from: schema.number({ defaultValue: 0, min: 0 }),
          q: schema.maybe(schema.string()),
          size: schema.number({ defaultValue: 10, min: 1 }),
        }),
      },
    },
    elasticsearchErrorHandler(log, async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;
      const engines = await client.asCurrentUser.transport.request<EnterpriseSearchEnginesResponse>(
        {
          method: 'GET',
          path: `/_application/search_application`,
          querystring: request.query,
        }
      );

      return response.ok({ body: engines });
    })
  );

  router.get(
    {
      path: '/internal/enterprise_search/engines/{engine_name}',
      validate: {
        params: schema.object({
          engine_name: schema.string(),
        }),
      },
    },
    elasticsearchErrorHandler(log, async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;
      const engine = await client.asCurrentUser.transport.request<EnterpriseSearchEngineDetails>({
        method: 'GET',
        path: `/_application/search_application/${request.params.engine_name}`,
      });
      return response.ok({ body: engine });
    })
  );

  router.put(
    {
      path: '/internal/enterprise_search/engines/{engine_name}',
      validate: {
        body: schema.object({
          indices: schema.arrayOf(schema.string()),
          name: schema.maybe(schema.string()),
        }),
        query: schema.object({
          create: schema.maybe(schema.boolean()),
        }),
        params: schema.object({
          engine_name: schema.string(),
        }),
      },
    },
    elasticsearchErrorHandler(log, async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;
      const engine =
        await client.asCurrentUser.transport.request<EnterpriseSearchEngineUpsertResponse>({
          method: 'PUT',
          path: `/_application/search_application/${request.params.engine_name}`,
          body: { indices: request.body.indices },
          querystring: request.query,
        });
      return response.ok({ body: engine });
    })
  );

  router.delete(
    {
      path: '/internal/enterprise_search/engines/{engine_name}',
      validate: {
        params: schema.object({
          engine_name: schema.string(),
        }),
      },
    },
    elasticsearchErrorHandler(log, async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;
      const engine = await client.asCurrentUser.transport.request<AcknowledgedResponseBase>({
        method: 'DELETE',
        path: `_application/search_application/${request.params.engine_name}`,
      });
      return response.ok({ body: engine });
    })
  );

  router.post(
    {
      path: '/internal/enterprise_search/engines/{engine_name}/search',
      validate: {
        body: schema.object({}, { unknowns: 'allow' }),
        params: schema.object({
          engine_name: schema.string(),
          from: schema.maybe(schema.number()),
          size: schema.maybe(schema.number()),
        }),
      },
    },
    elasticsearchErrorHandler(log, async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;
      const engines = await client.asCurrentUser.transport.request<SearchResponse>({
        method: 'POST',
        path: `/${request.params.engine_name}/_search`,
        body: {},
      });
      return response.ok({ body: engines });
    })
  );
  router.post(
    {
      path: '/internal/enterprise_search/engines/{engine_name}/api_key',
      validate: {
        body: schema.object({
          keyName: schema.string(),
        }),
        params: schema.object({
          engine_name: schema.string(),
        }),
      },
    },
    elasticsearchErrorHandler(log, async (context, request, response) => {
      const engineName = decodeURIComponent(request.params.engine_name);
      const { keyName } = request.body;
      const { client } = (await context.core).elasticsearch;

      const apiKey = await createApiKey(client, engineName, keyName);

      return response.ok({
        body: { apiKey },
        headers: { 'content-type': 'application/json' },
      });
    })
  );
  router.get(
    {
      path: '/internal/enterprise_search/engines/{engine_name}/field_capabilities',
      validate: { params: schema.object({ engine_name: schema.string() }) },
    },
    elasticsearchErrorHandler(log, async (context, request, response) => {
      const engineName = decodeURIComponent(request.params.engine_name);
      const { client } = (await context.core).elasticsearch;

      const engine = await fetchEnterpriseSearch<EnterpriseSearchEngineDetails>(
        config,
        request,
        `/api/engines/${engineName}`
      );

      if (!engine || (isResponseError(engine) && engine.responseStatus === 404)) {
        return createError({
          errorCode: ErrorCode.ENGINE_NOT_FOUND,
          message: 'Could not find engine',
          response,
          statusCode: 404,
        });
      }
      if (isResponseError(engine)) {
        return createError({
          errorCode: ErrorCode.UNCAUGHT_EXCEPTION,
          message: 'Error fetching engine',
          response,
          statusCode: engine.responseStatus,
        });
      }

      const data = await fetchEngineFieldCapabilities(client, engine);
      return response.ok({
        body: data,
        headers: { 'content-type': 'application/json' },
      });
    })
  );
}
