/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { deserializeFollowerIndex } from '../../../../common/services/follower_index_serialization';
import { addBasePath } from '../../../services';
import { RouteDependencies } from '../../../types';

/**
 * Returns a single follower index pattern
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
      path: addBasePath('/follower_indices/{id}'),
      validate: {
        params: paramsSchema,
      },
    },
    license.guardApiRoute(async (context, request, response) => {
      const { id } = request.params;

      try {
        const {
          follower_indices: followerIndices,
        } = await context.crossClusterReplication!.client.callAsCurrentUser('ccr.info', { id });

        const followerIndexInfo = followerIndices && followerIndices[0];

        if (!followerIndexInfo) {
          return response.notFound({
            body: `The follower index "${id}" does not exist.`,
          });
        }

        // If this follower is paused, skip call to ES stats api since it will return 404
        if (followerIndexInfo.status === 'paused') {
          return response.ok({
            body: deserializeFollowerIndex({
              ...followerIndexInfo,
            }),
          });
        } else {
          const {
            indices: followerIndicesStats,
          } = await context.crossClusterReplication!.client.callAsCurrentUser(
            'ccr.followerIndexStats',
            { id }
          );

          return response.ok({
            body: deserializeFollowerIndex({
              ...followerIndexInfo,
              ...(followerIndicesStats ? followerIndicesStats[0] : {}),
            }),
          });
        }
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
