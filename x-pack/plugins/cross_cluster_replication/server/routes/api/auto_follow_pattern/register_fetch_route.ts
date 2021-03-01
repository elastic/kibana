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
  lib: { isEsError, formatEsError },
}: RouteDependencies) => {
  router.get(
    {
      path: addBasePath('/auto_follow_patterns'),
      validate: false,
    },
    license.guardApiRoute(async (context, request, response) => {
      try {
        const result = await context.crossClusterReplication!.client.callAsCurrentUser(
          'ccr.autoFollowPatterns'
        );
        return response.ok({
          body: {
            patterns: deserializeListAutoFollowPatterns(result.patterns),
          },
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
