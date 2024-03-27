/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { RouteDependencies } from '../../../types';
import { addBasePath } from '..';

const paramsSchema = schema.object({
  indexName: schema.string(),
});

export function registerUpdateMappingRoute({ router, lib: { handleEsError } }: RouteDependencies) {
  router.put(
    {
      path: addBasePath('/mapping/{indexName}'),
      validate: {
        body: schema.maybe(schema.object({}, { unknowns: 'allow' })),
        params: paramsSchema,
      },
    },
    async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;
      const { indexName } = request.params as typeof paramsSchema.type;

      try {
        const responseBody = await client.asCurrentUser.indices.putMapping({
          properties: request.body,
          index: indexName,
        });
        return response.ok({ body: responseBody });
      } catch (error) {
        return handleEsError({ error, response });
      }
    }
  );
}
