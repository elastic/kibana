/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deserializeListAutoFollowPatterns } from '../../../../common/services/auto_follow_pattern_serialization';
import { addBasePath } from '../../../services';
import { RouteDependencies } from '../../../types';

/**
 * Get a list of all auto-follow patterns
 */
export const registerFetchRoute = ({
  router,
  license,
  lib: { handleEsError },
}: RouteDependencies) => {
  router.get(
    {
      path: addBasePath('/auto_follow_patterns'),
      validate: false,
    },
    license.guardApiRoute(async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;

      try {
        const { patterns } = await client.asCurrentUser.ccr.getAutoFollowPattern();
        return response.ok({
          body: {
            // @ts-expect-error Once #98266 is merged, test this again.
            patterns: deserializeListAutoFollowPatterns(patterns),
          },
        });
      } catch (error) {
        return handleEsError({ error, response });
      }
    })
  );
};
