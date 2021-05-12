/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { serializeAutoFollowPattern } from '../../../../common/services/auto_follow_pattern_serialization';
import { AutoFollowPattern } from '../../../../common/types';
import { addBasePath } from '../../../services';
import { RouteDependencies } from '../../../types';

/**
 * Create an auto-follow pattern
 */
export const registerCreateRoute = ({
  router,
  license,
  lib: { isEsError, formatEsError },
}: RouteDependencies) => {
  const bodySchema = schema.object({
    id: schema.string(),
    remoteCluster: schema.string(),
    leaderIndexPatterns: schema.arrayOf(schema.string()),
    followIndexPattern: schema.string(),
  });

  router.post(
    {
      path: addBasePath('/auto_follow_patterns'),
      validate: {
        body: bodySchema,
      },
    },
    license.guardApiRoute(async (context, request, response) => {
      const { id, ...rest } = request.body;
      const body = serializeAutoFollowPattern(rest as AutoFollowPattern);

      /**
       * First let's make sure that an auto-follow pattern with
       * the same id does not exist.
       */
      try {
        await context.crossClusterReplication!.client.callAsCurrentUser('ccr.autoFollowPattern', {
          id,
        });
        // If we get here it means that an auto-follow pattern with the same id exists
        return response.conflict({
          body: `An auto-follow pattern with the name "${id}" already exists.`,
        });
      } catch (err) {
        if (err.statusCode !== 404) {
          if (isEsError(err)) {
            return response.customError(formatEsError(err));
          }
          // Case: default
          throw err;
        }
      }

      try {
        return response.ok({
          body: await context.crossClusterReplication!.client.callAsCurrentUser(
            'ccr.saveAutoFollowPattern',
            { id, body }
          ),
        });
      } catch (err) {
        if (isEsError(err)) {
          return response.customError(formatEsError(err));
        }
        // Case: default
        throw err;
      }
    })
  );
};
