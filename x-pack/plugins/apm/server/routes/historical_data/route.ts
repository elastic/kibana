/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setupRequest } from '../../lib/helpers/setup_request';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import { hasHistoricalAgentData } from './has_historical_agent_data';

const hasDataRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/has_data',
  options: { tags: ['access:apm'] },
  handler: async (resources): Promise<{ hasData: boolean }> => {
    const setup = await setupRequest(resources);
    const hasData = await hasHistoricalAgentData(setup);
    return { hasData };
  },
});

export const historicalDataRouteRepository = hasDataRoute;
