/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { addBasePath } from '../../../services';
import { RouteDependencies } from '../../../types';

/**
 * Resume auto-follow pattern(s)
 */
export const registerResumeRoute = ({ router, license, lib }: RouteDependencies) => {
  const paramsSchema = schema.object({
    id: schema.string(),
  });

  router.post(
    {
      path: addBasePath('/auto_follow_patterns/{id}/resume'),
      validate: {
        params: paramsSchema,
      },
    },
    license.guardApiRoute(async (context, request, response) => {
      const { id } = request.params as typeof paramsSchema.type;
      const ids = id.split(',');

      const itemsResumed: string[] = [];
      const errors: Array<{ id: string; error: any }> = [];

      const formatError = (err: any) => {
        if (lib.isEsError(err)) {
          return response.customError({
            statusCode: err.statusCode,
            body: err,
          });
        }
        // Case: default
        return response.internalError({ body: err });
      };

      await Promise.all(
        ids.map((_id: string) =>
          context
            .crossClusterReplication!.client.callAsCurrentUser('ccr.resumeAutoFollowPattern', {
              id: _id,
            })
            .then(() => itemsResumed.push(_id))
            .catch(err => {
              errors.push({ id: _id, error: formatError(err) });
            })
        )
      );

      return response.ok({
        body: {
          itemsResumed,
          errors,
        },
      });
    })
  );
};
