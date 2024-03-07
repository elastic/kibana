/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getApmEventClient } from '../../lib/helpers/get_apm_event_client';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import { hasHistoricalAgentData } from './has_historical_agent_data';

const hasDataRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/has_data',
  options: { tags: ['access:apm'] },
  handler: async (resources): Promise<{ hasData: boolean }> => {
    const apmEventClient = await getApmEventClient(resources);
    const hasData = await hasHistoricalAgentData(apmEventClient);
    return { hasData };
  },
});

export const historicalDataRouteRepository = hasDataRoute;
