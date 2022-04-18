/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { ElasticsearchClient } from '@kbn/core/server';

import { RouteDependencies } from '../../../types';
import { addBasePath } from '../../../services';

async function deletePolicies(client: ElasticsearchClient, policyName: string): Promise<any> {
  const options = {
    // we allow 404 since they may have no policies
    ignore: [404],
  };

  return client.ilm.deleteLifecycle({ name: policyName }, options);
}

const paramsSchema = schema.object({
  policyNames: schema.string(),
});

export function registerDeleteRoute({
  router,
  license,
  lib: { handleEsError },
}: RouteDependencies) {
  router.delete(
    { path: addBasePath('/policies/{policyNames}'), validate: { params: paramsSchema } },
    license.guardApiRoute(async (context, request, response) => {
      const params = request.params as typeof paramsSchema.type;
      const { policyNames } = params;

      try {
        await deletePolicies(context.core.elasticsearch.client.asCurrentUser, policyNames);
        return response.ok();
      } catch (error) {
        return handleEsError({ error, response });
      }
    })
  );
}
