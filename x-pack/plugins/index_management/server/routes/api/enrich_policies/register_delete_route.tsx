/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { IScopedClusterClient } from '@kbn/core/server';
import { RouteDependencies } from '../../../types';
import { addBasePath } from '..';

const paramsSchema = schema.object({
  name: schema.string(),
});

export function registerDeleteRoute({ router, lib: { handleEsError } }: RouteDependencies) {
  router.delete(
    {
      path: addBasePath('/enrich_policies/{name}'),
      validate: { params: paramsSchema },
    },
    async (context, request, response) => {
      const { name } = request.params;
      const client = (await context.core).elasticsearch.client as IScopedClusterClient;

      try {
        const res = await client.asCurrentUser.enrich.deletePolicy({ name: 'pepe' });
        return response.ok({ body: res });
      } catch (error) {
        return handleEsError({ error, response });
      }
    }
  );
}
