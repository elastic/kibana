/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { badRequest, internal } from '@hapi/boom';
import { SecurityException } from '../../lib/streams/errors';
import { createServerRoute } from '../create_server_route';
import { syncStream } from '../../lib/streams/stream_crud';
import { rootStreamDefinition } from '../../lib/streams/root_stream_definition';
import { createStreamsIndex } from '../../lib/streams/internal_stream_mapping';

export const enableStreamsRoute = createServerRoute({
  endpoint: 'POST /api/streams/_enable',
  params: z.object({}),
  options: {
    access: 'internal',
  },
  security: {
    authz: {
      enabled: false,
      reason:
        'This API delegates security to the currently logged in user and their Elasticsearch permissions.',
    },
  },
  handler: async ({
    request,
    response,
    logger,
    getScopedClients,
  }): Promise<{ acknowledged: true }> => {
    try {
      const { scopedClusterClient } = await getScopedClients({ request });
      await createStreamsIndex(scopedClusterClient);
      await syncStream({
        scopedClusterClient,
        definition: rootStreamDefinition,
        logger,
      });
      return { acknowledged: true };
    } catch (e) {
      if (e instanceof SecurityException) {
        throw badRequest(e);
      }
      throw internal(e);
    }
  },
});
