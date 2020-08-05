/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';

import { deserializeAutoFollowPattern } from '../../../../common/services/auto_follow_pattern_serialization';
import { addBasePath } from '../../../services';
import { RouteDependencies } from '../../../types';

/**
 * Get a single auto-follow pattern
 */
export const registerGetRoute = ({
  router,
  license,
  lib: { isEsError, formatEsError },
}: RouteDependencies) => {
  const paramsSchema = schema.object({
    id: schema.string(),
  });

  router.get(
    {
      path: addBasePath('/auto_follow_patterns/{id}'),
      validate: {
        params: paramsSchema,
      },
    },
    license.guardApiRoute(async (context, request, response) => {
      const { id } = request.params;

      try {
        const result = await context.crossClusterReplication!.client.callAsCurrentUser(
          'ccr.autoFollowPattern',
          { id }
        );
        const autoFollowPattern = result.patterns[0];

        return response.ok({
          body: deserializeAutoFollowPattern(autoFollowPattern),
        });
      } catch (err) {
        if (isEsError(err)) {
          return response.customError(formatEsError(err));
        }
        // Case: default
        return response.internalError({ body: err });
      }
    })
  );
};
