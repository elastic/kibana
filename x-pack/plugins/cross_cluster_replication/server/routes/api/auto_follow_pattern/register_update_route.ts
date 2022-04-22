/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { serializeAutoFollowPattern } from '../../../../common/services/auto_follow_pattern_serialization';
import { AutoFollowPattern } from '../../../../common/types';
import { addBasePath } from '../../../services';
import { RouteDependencies } from '../../../types';

/**
 * Update an auto-follow pattern
 */
export const registerUpdateRoute = ({
  router,
  license,
  lib: { handleEsError },
}: RouteDependencies) => {
  const paramsSchema = schema.object({
    id: schema.string(),
  });

  const bodySchema = schema.object({
    active: schema.boolean(),
    remoteCluster: schema.string(),
    leaderIndexPatterns: schema.arrayOf(schema.string()),
    followIndexPattern: schema.string(),
  });

  router.put(
    {
      path: addBasePath('/auto_follow_patterns/{id}'),
      validate: {
        params: paramsSchema,
        body: bodySchema,
      },
    },
    license.guardApiRoute(async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;
      const { id } = request.params;
      const body = serializeAutoFollowPattern(request.body as AutoFollowPattern);

      try {
        const responseBody = await client.asCurrentUser.ccr.putAutoFollowPattern({
          name: id,
          body,
        });

        return response.ok({
          body: responseBody,
        });
      } catch (error) {
        return handleEsError({ error, response });
      }
    })
  );
};
