/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { RouteDependencies } from '../../../types';
import { addBasePath } from '../index';

const bodySchema = schema.any();

const paramsSchema = schema.object({
  indexName: schema.string(),
});

export function registerUpdateRoute({ router, lib: { handleEsError } }: RouteDependencies) {
  router.put(
    {
      path: addBasePath('/settings/{indexName}'),
      validate: { body: bodySchema, params: paramsSchema },
    },
    async (context, request, response) => {
      const { client } = context.core.elasticsearch;
      const { indexName } = request.params as typeof paramsSchema.type;
      const params = {
        ignore_unavailable: true,
        allow_no_indices: false,
        expand_wildcards: 'none' as const,
        index: indexName,
        body: request.body,
      };

      try {
        const responseBody = await client.asCurrentUser.indices.putSettings(params);
        return response.ok({ body: responseBody });
      } catch (error) {
        return handleEsError({ error, response });
      }
    }
  );
}
