/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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
  lib: { handleEsError },
}: RouteDependencies) => {
  router.get(
    {
      path: addBasePath('/follower_indices'),
      validate: false,
    },
    license.guardApiRoute(async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;

      try {
        const { follower_indices: followerIndices } = await client.asCurrentUser.ccr.followInfo({
          index: '_all',
        });

        const {
          follow_stats: { indices: followerIndicesStats },
        } = await client.asCurrentUser.ccr.stats();

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
      } catch (error) {
        return handleEsError({ error, response });
      }
    })
  );
};
