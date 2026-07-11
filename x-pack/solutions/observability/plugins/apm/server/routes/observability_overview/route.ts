/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  routeDefinitions,
  type ObservabilityOverviewHasDataResponse,
  type ObservabilityOverviewResponse,
} from '@kbn/apm-api-shared';
import { getApmEventClient } from '../../lib/helpers/get_apm_event_client';
import { getSearchTransactionsEvents } from '../../lib/helpers/transactions';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import { getObservabilityOverviewData } from './get_observability_overview_data';
import { getHasData } from './has_data';

const observabilityOverviewHasDataRoute = createApmServerRoute({
  endpoint: routeDefinitions.observabilityOverview.observabilityOverviewHasData.endpoint,
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<ObservabilityOverviewHasDataResponse> => {
    const apmEventClient = await getApmEventClient(resources);
    return await getHasData({
      indices: apmEventClient.indices,
      apmEventClient,
    });
  },
});

const observabilityOverviewRoute = createApmServerRoute({
  endpoint: routeDefinitions.observabilityOverview.observabilityOverview.endpoint,
  params: routeDefinitions.observabilityOverview.observabilityOverview.params,
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<ObservabilityOverviewResponse> => {
    const apmEventClient = await getApmEventClient(resources);
    const { bucketSize, intervalString, start, end } = resources.params.query;

    const searchAggregatedTransactions = await getSearchTransactionsEvents({
      apmEventClient,
      config: resources.config,
      start,
      end,
      kuery: '',
    });

    return getObservabilityOverviewData({
      apmEventClient,
      start,
      end,
      bucketSize,
      intervalString,
      searchAggregatedTransactions,
    });
  },
});

export const observabilityOverviewRouteRepository = {
  ...observabilityOverviewRoute,
  ...observabilityOverviewHasDataRoute,
};
