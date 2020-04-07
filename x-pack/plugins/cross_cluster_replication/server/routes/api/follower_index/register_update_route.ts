/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { serializeAdvancedSettings } from '../../../../common/services/follower_index_serialization';
import { FollowerIndexAdvancedSettings } from '../../../../common/types';
import { removeEmptyFields } from '../../../../common/services/utils';
import { addBasePath } from '../../../services';
import { RouteDependencies } from '../../../types';

/**
 * Update a follower index
 */
export const registerUpdateRoute = ({ router, license, lib }: RouteDependencies) => {
  const paramsSchema = schema.object({ id: schema.string() });

  router.put(
    {
      path: addBasePath('/follower_indices/{id}'),
      validate: {
        params: paramsSchema,
      },
    },
    license.guardApiRoute(async (context, request, response) => {
      const { id } = request.params as typeof paramsSchema.type;

      // We need to first pause the follower and then resume it passing the advanced settings
      try {
        const {
          follower_indices: followerIndices,
        } = await context.crossClusterReplication!.client.callAsCurrentUser('ccr.info', { id });
        const followerIndexInfo = followerIndices && followerIndices[0];
        if (!followerIndexInfo) {
          return response.notFound({ body: `The follower index "${id}" does not exist.` });
        }

        // Retrieve paused state instead of pulling it from the payload to ensure it's not stale.
        const isPaused = followerIndexInfo.status === 'paused';
        // Pause follower if not already paused
        if (!isPaused) {
          await context.crossClusterReplication!.client.callAsCurrentUser(
            'ccr.pauseFollowerIndex',
            {
              id,
            }
          );
        }

        // Resume follower
        const body = removeEmptyFields(
          serializeAdvancedSettings(request.body as FollowerIndexAdvancedSettings)
        );
        return response.ok({
          body: await context.crossClusterReplication!.client.callAsCurrentUser(
            'ccr.resumeFollowerIndex',
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
