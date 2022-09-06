/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { RouteDependencies } from '../../../types';
import { addBasePath } from '..';

const bodySchema = schema.object({
  index: schema.string(),
  master_timeout: schema.maybe(schema.oneOf([schema.string(), schema.number()])),
  timeout: schema.maybe(schema.oneOf([schema.string(), schema.number()])),
  wait_for_active_shards: schema.maybe(
    schema.oneOf([schema.number(), schema.literal('all'), schema.literal('index-setting')])
  ),
  aliases: schema.maybe(schema.recordOf(schema.string(), schema.any())),
  mappings: schema.maybe(schema.recordOf(schema.string(), schema.any())),
  settings: schema.maybe(schema.recordOf(schema.string(), schema.any())),
});

export function registerCreateRoute({ router, lib: { handleEsError } }: RouteDependencies) {
  router.put(
    { path: addBasePath('/indices/create'), validate: { body: bodySchema } },
    async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;
      const { index, mappings } = request.body as typeof bodySchema.type;

      const params = {
        index,
        mappings,
      };

      try {
        await client.asCurrentUser.indices.create(params);
        return response.ok();
      } catch (error) {
        return handleEsError({ error, response });
      }
    }
  );
}
