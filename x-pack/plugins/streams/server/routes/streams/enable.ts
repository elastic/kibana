/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { SecurityException } from '../../lib/streams/errors';
import { createServerRoute } from '../create_server_route';
import { bootstrapRootEntity } from '../../lib/streams/bootstrap_root_assets';
import { createStream } from '../../lib/streams/stream_crud';
import { rootStreamDefinition } from '../../lib/streams/root_stream_definition';

export const enableStreamsRoute = createServerRoute({
  endpoint: 'POST /internal/streams/_enable',
  params: z.object({}),
  options: {
    security: {
      authz: {
        requiredPrivileges: ['streams_enable'],
      },
    },
  },
  handler: async ({ request, response, logger, getScopedClients }) => {
    try {
      const { scopedClusterClient } = await getScopedClients({ request });
      await bootstrapRootEntity({
        esClient: scopedClusterClient.asSecondaryAuthUser,
        logger,
      });
      await createStream({
        scopedClusterClient,
        definition: rootStreamDefinition,
        logger,
      });
      return response.ok({ body: { acknowledged: true } });
    } catch (e) {
      if (e instanceof SecurityException) {
        return response.customError({ body: e, statusCode: 400 });
      }
      return response.customError({ body: e, statusCode: 500 });
    }
  },
});
