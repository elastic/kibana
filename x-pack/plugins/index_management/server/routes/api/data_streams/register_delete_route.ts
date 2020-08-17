/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema, TypeOf } from '@kbn/config-schema';

import { RouteDependencies } from '../../../types';
import { addBasePath } from '../index';
import { wrapEsError } from '../../helpers';

const bodySchema = schema.object({
  dataStreams: schema.arrayOf(schema.string()),
});

export function registerDeleteRoute({ router, license }: RouteDependencies) {
  router.post(
    {
      path: addBasePath('/delete_data_streams'),
      validate: { body: bodySchema },
    },
    license.guardApiRoute(async (ctx, req, res) => {
      const { callAsCurrentUser } = ctx.dataManagement!.client;
      const { dataStreams } = req.body as TypeOf<typeof bodySchema>;

      const response: { dataStreamsDeleted: string[]; errors: any[] } = {
        dataStreamsDeleted: [],
        errors: [],
      };

      await Promise.all(
        dataStreams.map(async (name: string) => {
          try {
            await callAsCurrentUser('dataManagement.deleteDataStream', {
              name,
            });

            return response.dataStreamsDeleted.push(name);
          } catch (e) {
            return response.errors.push({
              name,
              error: wrapEsError(e),
            });
          }
        })
      );

      return res.ok({ body: response });
    })
  );
}
