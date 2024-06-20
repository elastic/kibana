/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apmEnableMultiSignal } from '@kbn/observability-plugin/common';
import { createEntitiesESClient } from '../../lib/helpers/create_es_client/create_assets_es_client/create_assets_es_clients';
import { getApmEventClient } from '../../lib/helpers/get_apm_event_client';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import { hasHistoricalAgentData } from './has_historical_agent_data';
import { hasEntitiesData } from './has_historical_entities_data';

const hasDataRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/has_data',
  options: { tags: ['access:apm'] },
  handler: async (resources): Promise<{ hasData: boolean }> => {
    const { context, request } = resources;
    const coreContext = await context.core;

    const {
      uiSettings: { client: uiSettingsClient },
    } = coreContext;

    const [apmEventClient, entitiesESClient, isApmEnableMultiSignal] = await Promise.all([
      getApmEventClient(resources),
      createEntitiesESClient({
        request,
        esClient: coreContext.elasticsearch.client.asCurrentUser,
      }),
      uiSettingsClient.get<boolean>(apmEnableMultiSignal),
    ]);

    if (isApmEnableMultiSignal) {
      const hasData = await hasEntitiesData(entitiesESClient);
      return { hasData };
    }

    const hasData = await hasHistoricalAgentData(apmEventClient);
    return { hasData };
  },
});

export const historicalDataRouteRepository = hasDataRoute;
