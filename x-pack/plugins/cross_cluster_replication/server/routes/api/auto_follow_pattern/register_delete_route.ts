/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { addBasePath } from '../../../services';
import { RouteDependencies } from '../../../types';

/**
 * Delete an auto-follow pattern
 */
export const registerDeleteRoute = ({
  router,
  license,
  lib: { handleEsError },
}: RouteDependencies) => {
  const paramsSchema = schema.object({
    id: schema.string(),
  });

  router.delete(
    {
      path: addBasePath('/auto_follow_patterns/{id}'),
      validate: {
        params: paramsSchema,
      },
    },
    license.guardApiRoute(async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;
      const { id } = request.params;
      const ids = id.split(',');

      const itemsDeleted: string[] = [];
      const errors: Array<{ id: string; error: any }> = [];

      await Promise.all(
        ids.map((_id) =>
          client.asCurrentUser.ccr
            .deleteAutoFollowPattern({
              name: _id,
            })
            .then(() => itemsDeleted.push(_id))
            .catch((error: any) => {
              errors.push({ id: _id, error: handleEsError({ error, response }) });
            })
        )
      );

      return response.ok({
        body: {
          itemsDeleted,
          errors,
        },
      });
    })
  );
};
