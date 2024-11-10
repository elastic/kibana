/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerRoute } from '../create_server_route';
import { ListStreamResponse, listStreams } from '../../lib/streams/stream_crud';

export const listStreamsRoute = createServerRoute({
  endpoint: 'GET /api/streams 2023-10-31',
  options: {
    access: 'public',
    security: {
      authz: {
        requiredPrivileges: ['streams_read'],
      },
    },
  },
  handler: async ({
    response,
    request,
    getScopedClients,
    logger,
  }): Promise<{
    streams: ListStreamResponse;
  }> => {
    const { scopedClusterClient } = await getScopedClients({ request });
    const streams = await listStreams({
      scopedClusterClient,
      logger,
    });

    return { streams };
  },
});
