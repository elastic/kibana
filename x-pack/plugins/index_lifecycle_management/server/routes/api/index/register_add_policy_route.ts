/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { ElasticsearchClient } from 'kibana/server';

import { RouteDependencies } from '../../../types';
import { addBasePath } from '../../../services';

async function addLifecyclePolicy(
  client: ElasticsearchClient,
  indexName: string,
  policyName: string,
  alias: string
) {
  const body = {
    lifecycle: {
      name: policyName,
      rollover_alias: alias,
    },
  };

  return client.indices.putSettings({ index: indexName, body });
}

const bodySchema = schema.object({
  indexName: schema.string(),
  policyName: schema.string(),
  alias: schema.maybe(schema.string()),
});

export function registerAddPolicyRoute({
  router,
  license,
  lib: { handleEsError },
}: RouteDependencies) {
  router.post(
    { path: addBasePath('/index/add'), validate: { body: bodySchema } },
    license.guardApiRoute(async (context, request, response) => {
      const body = request.body as typeof bodySchema.type;
      const { indexName, policyName, alias = '' } = body;

      try {
        const esClient = (await context.core).elasticsearch.client;
        await addLifecyclePolicy(esClient.asCurrentUser, indexName, policyName, alias);
        return response.ok();
      } catch (error) {
        return handleEsError({ error, response });
      }
    })
  );
}
