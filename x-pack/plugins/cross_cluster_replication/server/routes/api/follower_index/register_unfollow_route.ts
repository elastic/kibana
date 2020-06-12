/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { addBasePath } from '../../../services';
import { RouteDependencies } from '../../../types';

/**
 * Unfollow follower index's leader index
 */
export const registerUnfollowRoute = ({
  router,
  license,
  lib: { isEsError, formatEsError },
}: RouteDependencies) => {
  const paramsSchema = schema.object({ id: schema.string() });

  router.put(
    {
      path: addBasePath('/follower_indices/{id}/unfollow'),
      validate: {
        params: paramsSchema,
      },
    },
    license.guardApiRoute(async (context, request, response) => {
      const { id } = request.params;
      const ids = id.split(',');

      const itemsUnfollowed: string[] = [];
      const itemsNotOpen: string[] = [];
      const errors: Array<{ id: string; error: any }> = [];

      const formatError = (err: any) => {
        if (isEsError(err)) {
          return response.customError(formatEsError(err));
        }
        // Case: default
        return response.internalError({ body: err });
      };

      await Promise.all(
        ids.map(async (_id: string) => {
          try {
            // Try to pause follower, let it fail silently since it may already be paused
            try {
              await context.crossClusterReplication!.client.callAsCurrentUser(
                'ccr.pauseFollowerIndex',
                { id: _id }
              );
            } catch (e) {
              // Swallow errors
            }

            // Close index
            await context.crossClusterReplication!.client.callAsCurrentUser('indices.close', {
              index: _id,
            });

            // Unfollow leader
            await context.crossClusterReplication!.client.callAsCurrentUser(
              'ccr.unfollowLeaderIndex',
              { id: _id }
            );

            // Try to re-open the index, store failures in a separate array to surface warnings in the UI
            // This will allow users to query their index normally after unfollowing
            try {
              await context.crossClusterReplication!.client.callAsCurrentUser('indices.open', {
                index: _id,
              });
            } catch (e) {
              itemsNotOpen.push(_id);
            }

            // Push success
            itemsUnfollowed.push(_id);
          } catch (err) {
            errors.push({ id: _id, error: formatError(err) });
          }
        })
      );

      return response.ok({
        body: {
          itemsUnfollowed,
          itemsNotOpen,
          errors,
        },
      });
    })
  );
};
