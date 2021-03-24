/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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
export const registerUpdateRoute = ({
  router,
  license,
  lib: { isEsError, formatEsError },
}: RouteDependencies) => {
  const paramsSchema = schema.object({ id: schema.string() });

  const bodySchema = schema.object({
    maxReadRequestOperationCount: schema.maybe(schema.number()),
    maxOutstandingReadRequests: schema.maybe(schema.number()),
    maxReadRequestSize: schema.maybe(schema.string()), // byte value
    maxWriteRequestOperationCount: schema.maybe(schema.number()),
    maxWriteRequestSize: schema.maybe(schema.string()), // byte value
    maxOutstandingWriteRequests: schema.maybe(schema.number()),
    maxWriteBufferCount: schema.maybe(schema.number()),
    maxWriteBufferSize: schema.maybe(schema.string()), // byte value
    maxRetryDelay: schema.maybe(schema.string()), // time value
    readPollTimeout: schema.maybe(schema.string()), // time value
  });

  router.put(
    {
      path: addBasePath('/follower_indices/{id}'),
      validate: {
        params: paramsSchema,
        body: bodySchema,
      },
    },
    license.guardApiRoute(async (context, request, response) => {
      const { id } = request.params;

      // We need to first pause the follower and then resume it by passing the advanced settings
      try {
        const {
          follower_indices: followerIndices,
        } = await context.crossClusterReplication.client.callAsCurrentUser('ccr.info', { id });

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
        if (isEsError(err)) {
          return response.customError(formatEsError(err));
        }
        // Case: default
        throw err;
      }
    })
  );
};
