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

async function retryLifecycle(client: ElasticsearchClient, indexNames: string[]) {
  const options = {
    ignore: [404],
  };
  const responses = [];
  for (let i = 0; i < indexNames.length; i++) {
    const indexName = indexNames[i];

    responses.push(client.ilm.retry({ index: indexName }, options));
  }
  return Promise.all(responses);
}

const bodySchema = schema.object({
  indexNames: schema.arrayOf(schema.string()),
});

export function registerRetryRoute({ router, license, lib: { handleEsError } }: RouteDependencies) {
  router.post(
    { path: addBasePath('/index/retry'), validate: { body: bodySchema } },
    license.guardApiRoute(async (context, request, response) => {
      const body = request.body as typeof bodySchema.type;
      const { indexNames } = body;

      try {
        const esClient = (await context.core).elasticsearch.client;
        await retryLifecycle(esClient.asCurrentUser, indexNames);
        return response.ok();
      } catch (error) {
        return handleEsError({ error, response });
      }
    })
  );
}
