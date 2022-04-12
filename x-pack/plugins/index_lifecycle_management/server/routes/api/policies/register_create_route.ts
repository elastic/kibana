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

async function createPolicy(
  client: ElasticsearchClient,
  name: string,
  policy: Omit<typeof bodySchema.type, 'name'>
): Promise<any> {
  const body = { policy };
  const options = {
    ignore: [404],
  };

  return client.ilm.putLifecycle({ name, body }, options);
}

/**
 * We intentionally do not deeply validate the posted policy object to avoid erroring on valid ES
 * policy configuration Kibana UI does not know or should not know about. For instance, the
 * `force_merge_index` setting of the `searchable_snapshot` action.
 *
 * We only specify a rough structure based on https://www.elastic.co/guide/en/elasticsearch/reference/current/_actions.html.
 */
const bodySchema = schema.object({
  name: schema.string(),
  phases: schema.object({
    hot: schema.any(),
    warm: schema.maybe(schema.any()),
    cold: schema.maybe(schema.any()),
    frozen: schema.maybe(schema.any()),
    delete: schema.maybe(schema.any()),
  }),
  _meta: schema.maybe(schema.any()),
});

export function registerCreateRoute({
  router,
  license,
  lib: { handleEsError },
}: RouteDependencies) {
  router.post(
    { path: addBasePath('/policies'), validate: { body: bodySchema } },
    license.guardApiRoute(async (context, request, response) => {
      const body = request.body as typeof bodySchema.type;
      const { name, ...rest } = body;

      try {
        const esClient = (await context.core).elasticsearch.client;
        await createPolicy(esClient.asCurrentUser, name, rest);
        return response.ok();
      } catch (error) {
        return handleEsError({ error, response });
      }
    })
  );
}
