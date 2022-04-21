/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { serializeFollowerIndex } from '../../../../common/services/follower_index_serialization';
import { FollowerIndex } from '../../../../common/types';
import { addBasePath } from '../../../services';
import { removeEmptyFields } from '../../../../common/services/utils';
import { RouteDependencies } from '../../../types';

/**
 * Create a follower index
 */
export const registerCreateRoute = ({
  router,
  license,
  lib: { handleEsError },
}: RouteDependencies) => {
  const bodySchema = schema.object({
    name: schema.string(),
    remoteCluster: schema.string(),
    leaderIndex: schema.string(),
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

  router.post(
    {
      path: addBasePath('/follower_indices'),
      validate: {
        body: bodySchema,
      },
    },
    license.guardApiRoute(async (context, request, response) => {
      const { client } = context.core.elasticsearch;
      const { name, ...rest } = request.body;
      const body = removeEmptyFields(serializeFollowerIndex(rest as FollowerIndex));

      try {
        const responseBody = await client.asCurrentUser.ccr.follow({
          index: name,
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
