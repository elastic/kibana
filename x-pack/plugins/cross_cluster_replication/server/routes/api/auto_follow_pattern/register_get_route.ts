/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { deserializeAutoFollowPattern } from '../../../../common/services/auto_follow_pattern_serialization';
import { addBasePath } from '../../../services';
import { RouteDependencies } from '../../../types';

/**
 * Get a single auto-follow pattern
 */
export const registerGetRoute = ({
  router,
  license,
  lib: { handleEsError },
}: RouteDependencies) => {
  const paramsSchema = schema.object({
    id: schema.string(),
  });

  router.get(
    {
      path: addBasePath('/auto_follow_patterns/{id}'),
      validate: {
        params: paramsSchema,
      },
    },
    license.guardApiRoute(async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;
      const { id } = request.params;

      try {
        const result = await client.asCurrentUser.ccr.getAutoFollowPattern({
          name: id,
        });

        const autoFollowPattern = result.patterns[0];

        return response.ok({
          // @ts-expect-error Once #98266 is merged, test this again.
          body: deserializeAutoFollowPattern(autoFollowPattern),
        });
      } catch (error) {
        return handleEsError({ error, response });
      }
    })
  );
};
