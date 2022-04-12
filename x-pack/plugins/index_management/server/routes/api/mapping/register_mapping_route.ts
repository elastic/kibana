/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { RouteDependencies } from '../../../types';
import { addBasePath } from '../index';

const paramsSchema = schema.object({
  indexName: schema.string(),
});

function formatHit(hit: { [key: string]: { mappings: any } }, indexName: string) {
  const mappings = hit[indexName].mappings;
  return {
    mappings,
  };
}

export function registerMappingRoute({ router, lib: { handleEsError } }: RouteDependencies) {
  router.get(
    { path: addBasePath('/mapping/{indexName}'), validate: { params: paramsSchema } },
    async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;
      const { indexName } = request.params as typeof paramsSchema.type;
      const params = {
        expand_wildcards: 'none' as const,
        index: indexName,
      };

      try {
        const hit = await client.asCurrentUser.indices.getMapping(params);
        const responseBody = formatHit(hit, indexName);
        return response.ok({ body: responseBody });
      } catch (error) {
        return handleEsError({ error, response });
      }
    }
  );
}
