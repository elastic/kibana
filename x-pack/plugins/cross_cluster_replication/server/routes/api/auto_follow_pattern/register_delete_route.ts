/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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
  lib: { isEsError, formatEsError },
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
      const { id } = request.params;
      const ids = id.split(',');

      const itemsDeleted: string[] = [];
      const errors: Array<{ id: string; error: any }> = [];

      const formatError = (err: any) => {
        if (isEsError(err)) {
          return response.customError(formatEsError(err));
        }
        // Case: default
        return response.internalError({ body: err });
      };

      await Promise.all(
        ids.map((_id) =>
          context
            .crossClusterReplication!.client.callAsCurrentUser('ccr.deleteAutoFollowPattern', {
              id: _id,
            })
            .then(() => itemsDeleted.push(_id))
            .catch((err: any) => {
              errors.push({ id: _id, error: formatError(err) });
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
