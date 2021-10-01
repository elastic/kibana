/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { RouteDependencies } from '../../../types';
import { addBasePath } from '../index';

const bodySchema = schema.object({
  indices: schema.arrayOf(schema.string()),
});

export function registerClearCacheRoute({ router, lib: { handleEsError } }: RouteDependencies) {
  router.post(
    { path: addBasePath('/indices/clear_cache'), validate: { body: bodySchema } },
    async (context, request, response) => {
      const { client } = context.core.elasticsearch;
      const { indices = [] } = request.body as typeof bodySchema.type;

      const params = {
        expand_wildcards: 'none',
        format: 'json',
        index: indices,
      };

      try {
        await client.asCurrentUser.indices.clearCache(params);
        return response.ok();
      } catch (error) {
        return handleEsError({ error, response });
      }
    }
  );
}
