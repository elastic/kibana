/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { addBasePath } from '../../../services';
import { deserializeAutoFollowStats } from '../../../lib/ccr_stats_serialization';
import { RouteDependencies } from '../../../types';

/**
 * Returns Auto-follow stats
 */
export const registerStatsRoute = ({
  router,
  license,
  lib: { isEsError, formatEsError },
}: RouteDependencies) => {
  router.get(
    {
      path: addBasePath('/stats/auto_follow'),
      validate: false,
    },
    license.guardApiRoute(async (context, request, response) => {
      try {
        const {
          auto_follow_stats: autoFollowStats,
        } = await context.crossClusterReplication!.client.callAsCurrentUser('ccr.stats');

        return response.ok({
          body: deserializeAutoFollowStats(autoFollowStats),
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
