/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { IScopedClusterClient } from '@kbn/core/server';
import { RouteDependencies } from '../../../types';
import { addInternalBasePath } from '..';
import { enrichPoliciesActions } from '../../../lib/enrich_policies';

const paramsSchema = schema.object({
  name: schema.string(),
});

export function registerExecuteRoute({ router, lib: { handleEsError } }: RouteDependencies) {
  router.put(
    {
      path: addInternalBasePath('/enrich_policies/{name}'),
      validate: { params: paramsSchema },
    },
    async (context, request, response) => {
      const { name } = request.params;
      const client = (await context.core).elasticsearch.client as IScopedClusterClient;

      try {
        const res = await enrichPoliciesActions.execute(client, name);
        return response.ok({ body: res });
      } catch (error) {
        return handleEsError({ error, response });
      }
    }
  );
}
