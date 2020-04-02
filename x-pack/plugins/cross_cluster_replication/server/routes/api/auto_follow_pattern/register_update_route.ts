/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
// @ts-ignore
import {
  serializeAutoFollowPattern,
  // @ts-ignore
} from '../../../../common/services/auto_follow_pattern_serialization';
import { addBasePath } from '../../../services';
import { RouteDependencies } from '../../../types';

/**
 * Update an auto-follow pattern
 */
export const registerUpdateRoute = ({ router, license, lib }: RouteDependencies) => {
  const paramsSchema = schema.object({
    id: schema.string(),
  });

  router.put(
    {
      path: addBasePath('/auto_follow_patterns/{id}'),
      validate: {
        params: paramsSchema,
        body: schema.object({}, { unknowns: 'allow' }),
      },
    },
    license.guardApiRoute(async (context, request, response) => {
      const { id } = request.params as typeof paramsSchema.type;
      const body = serializeAutoFollowPattern(request.body);

      try {
        return response.ok({
          body: await context.crossClusterReplication!.client.callAsCurrentUser(
            'ccr.saveAutoFollowPattern',
            { id, body }
          ),
        });
      } catch (err) {
        if (lib.isEsError(err)) {
          return response.customError({
            statusCode: err.statusCode,
            body: err,
          });
        }
        // Case: default
        return response.internalError({ body: err });
      }
    })
  );
};
