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

// response comes back as { [indexName]: { ... }}
// so plucking out the embedded object
function formatHit(hit: { [key: string]: {} }) {
  const key = Object.keys(hit)[0];
  return hit[key];
}

export function registerLoadRoute({ router, lib: { handleEsError } }: RouteDependencies) {
  router.get(
    { path: addBasePath('/settings/{indexName}'), validate: { params: paramsSchema } },
    async (context, request, response) => {
      const { client } = context.core.elasticsearch;
      const { indexName } = request.params as typeof paramsSchema.type;
      const params = {
        expand_wildcards: 'none' as const,
        flat_settings: false,
        local: false,
        include_defaults: true,
        index: indexName,
      };

      try {
        const hit = await client.asCurrentUser.indices.getSettings(params);
        return response.ok({ body: formatHit(hit) });
      } catch (error) {
        return handleEsError({ error, response });
      }
    }
  );
}
