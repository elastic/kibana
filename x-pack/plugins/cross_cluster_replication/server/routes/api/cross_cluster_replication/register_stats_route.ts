/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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
  lib: { handleEsError },
}: RouteDependencies) => {
  router.get(
    {
      path: addBasePath('/stats/auto_follow'),
      validate: false,
    },
    license.guardApiRoute(async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;

      try {
        const { auto_follow_stats: autoFollowStats } = await client.asCurrentUser.ccr.stats();

        return response.ok({
          // @ts-expect-error Once #98266 is merged, test this again.
          body: deserializeAutoFollowStats(autoFollowStats),
        });
      } catch (error) {
        return handleEsError({ error, response });
      }
    })
  );
};
