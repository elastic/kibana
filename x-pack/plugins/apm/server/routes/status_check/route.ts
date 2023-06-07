/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import {
  checkAgentStatus,
  AgentStatusCheckResponse,
} from './agent_status_check';
import { getApmEventClient } from '../../lib/helpers/get_apm_event_client';

const agentStatusCheckRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/agent_status',
  options: { tags: ['access:apm'] },

  handler: async (resources): Promise<AgentStatusCheckResponse> => {
    const apmEventClient = await getApmEventClient(resources);
    const agentStatus = await checkAgentStatus({
      apmEventClient,
    });

    return agentStatus;
  },
});

export const statusCheckRouteRepository = {
  ...agentStatusCheckRoute,
};
