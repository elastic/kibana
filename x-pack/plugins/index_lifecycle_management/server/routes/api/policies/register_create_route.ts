/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { ElasticsearchClient } from 'kibana/server';

import { RouteDependencies } from '../../../types';
import { addBasePath } from '../../../services';

async function createPolicy(client: ElasticsearchClient, name: string, phases: any): Promise<any> {
  const body = {
    policy: {
      phases,
    },
  };
  const options = {
    ignore: [404],
  };

  return client.ilm.putLifecycle({ policy: name, body }, options);
}

// Per https://www.elastic.co/guide/en/elasticsearch/reference/current/_actions.html
const bodySchema = schema.object({
  name: schema.string(),
  phases: schema.object({
    hot: schema.any(),
    warm: schema.maybe(schema.any()),
    cold: schema.maybe(schema.any()),
    delete: schema.maybe(schema.any()),
  }),
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
      const { name, phases } = body;

      try {
        await createPolicy(context.core.elasticsearch.client.asCurrentUser, name, phases);
        return response.ok();
      } catch (error) {
        return handleEsError({ error, response });
      }
    })
  );
}
