/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { deserializeListFollowerIndices } from '../../../../common/services/follower_index_serialization';
import { addBasePath } from '../../../services';
import { RouteDependencies } from '../../../types';

/**
 * Returns a list of all follower indices
 */
export const registerFetchRoute = ({
  router,
  license,
  lib: { isEsError, formatEsError },
}: RouteDependencies) => {
  router.get(
    {
      path: addBasePath('/follower_indices'),
      validate: false,
    },
    license.guardApiRoute(async (context, request, response) => {
      try {
        const {
          follower_indices: followerIndices,
        } = await context.crossClusterReplication!.client.callAsCurrentUser('ccr.info', {
          id: '_all',
        });

        const {
          follow_stats: { indices: followerIndicesStats },
        } = await context.crossClusterReplication!.client.callAsCurrentUser('ccr.stats');

        const followerIndicesStatsMap = followerIndicesStats.reduce((map: any, stats: any) => {
          map[stats.index] = stats;
          return map;
        }, {});

        const collatedFollowerIndices = followerIndices.map((followerIndex: any) => {
          return {
            ...followerIndex,
            ...followerIndicesStatsMap[followerIndex.follower_index],
          };
        });

        return response.ok({
          body: {
            indices: deserializeListFollowerIndices(collatedFollowerIndices),
          },
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
