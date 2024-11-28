/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { streamsEnabled } from '../../lib/streams/stream_crud';
import { createServerRoute } from '../create_server_route';

export const getStreamsStatusRoute = createServerRoute({
  endpoint: 'GET /api/streams/_status',
  options: {
    access: 'internal',
  },
  security: {
    authz: {
      requiredPrivileges: ['streams_read'],
    },
  },
  handler: async ({ request, getScopedClients }): Promise<{ enabled: boolean }> => {
    const { scopedClusterClient } = await getScopedClients({ request });

    return {
      enabled: await streamsEnabled({ scopedClusterClient }),
    };
  },
});

export const streamsStatusRoutes = {
  ...getStreamsStatusRoute,
};
