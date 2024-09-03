/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createEntitiesESClient } from '../../lib/helpers/create_es_client/create_assets_es_client/create_assets_es_clients';
import { getApmEventClient } from '../../lib/helpers/get_apm_event_client';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import { hasHistoricalAgentData } from './has_historical_agent_data';
import { hasEntitiesData } from './has_historical_entities_data';

const hasDataRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/has_data',
  options: { tags: ['access:apm'] },
  handler: async (resources): Promise<{ hasData: boolean }> => {
    const apmEventClient = await getApmEventClient(resources);
    const hasData = await hasHistoricalAgentData(apmEventClient);
    return { hasData };
  },
});

const hasEntitiesRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/has_entities',
  options: { tags: ['access:apm'] },
  handler: async (resources): Promise<{ hasData: boolean }> => {
    const { context, request, logger } = resources;
    const coreContext = await context.core;

    const entitiesESClient = await createEntitiesESClient({
      request,
      esClient: coreContext.elasticsearch.client.asCurrentUser,
    });

    const hasData = await hasEntitiesData(entitiesESClient, logger);
    return { hasData };
  },
});

export const historicalDataRouteRepository = { ...hasDataRoute, ...hasEntitiesRoute };
