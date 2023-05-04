/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';

import { RouteDependencies } from '../../../types';
import { addBasePath } from '..';

const bodySchema = schema.object({
  dataStreams: schema.arrayOf(schema.string()),
});

export function registerDeleteRoute({ router, lib: { handleEsError } }: RouteDependencies) {
  router.post(
    {
      path: addBasePath('/delete_data_streams'),
      validate: { body: bodySchema },
    },
    async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;
      const { dataStreams } = request.body as TypeOf<typeof bodySchema>;

      const responseBody: { dataStreamsDeleted: string[]; errors: any[] } = {
        dataStreamsDeleted: [],
        errors: [],
      };

      await Promise.all(
        dataStreams.map(async (name: string) => {
          try {
            await client.asCurrentUser.indices.deleteDataStream({
              name,
            });

            return responseBody.dataStreamsDeleted.push(name);
          } catch (error) {
            return responseBody.errors.push({
              name,
              error: handleEsError({ error, response }),
            });
          }
        })
      );

      return response.ok({ body: responseBody });
    }
  );
}
