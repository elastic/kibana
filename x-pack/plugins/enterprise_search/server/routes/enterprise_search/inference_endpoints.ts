/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InferenceAPIConfigResponse } from '@kbn/ml-trained-models-utils';

import { RouteDependencies } from '../../plugin';
import { elasticsearchErrorHandler } from '../../utils/elasticsearch_error_handler';

export function registerInferenceEndpointRoutes({ router, log }: RouteDependencies) {
  router.get(
    {
      path: '/internal/enterprise_search/inference_endpoints',
      validate: {},
    },
    elasticsearchErrorHandler(log, async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;
      const { endpoints } = await client.asCurrentUser.transport.request<{
        endpoints: InferenceAPIConfigResponse[];
      }>({
        method: 'GET',
        path: `/_inference/_all`,
      });

      return response.ok({
        body: {
          inference_endpoints: endpoints,
        },
        headers: { 'content-type': 'application/json' },
      });
    })
  );
}
