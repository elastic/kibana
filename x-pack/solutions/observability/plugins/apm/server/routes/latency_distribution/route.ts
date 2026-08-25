/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { termQuery } from '@kbn/observability-plugin/server';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { LatencyDistributionChartType } from '@kbn/apm-types';
import {
  routeDefinitions,
  type LatencyOverallTransactionDistributionResponse,
} from '@kbn/apm-api-shared';
import { getOverallLatencyDistribution } from './get_overall_latency_distribution';
import { getSearchTransactionsEvents } from '../../lib/helpers/transactions';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import { SERVICE_NAME, TRANSACTION_NAME, TRANSACTION_TYPE } from '../../../common/es_fields/apm';
import { getApmEventClient } from '../../lib/helpers/get_apm_event_client';

const latencyOverallTransactionDistributionRoute = createApmServerRoute({
  endpoint: routeDefinitions.latencyDistribution.overallTransactionDistribution.endpoint,
  params: routeDefinitions.latencyDistribution.overallTransactionDistribution.params,
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<LatencyOverallTransactionDistributionResponse> => {
    const apmEventClient = await getApmEventClient(resources);

    const {
      environment,
      kuery,
      serviceName,
      transactionType,
      transactionName,
      start,
      end,
      percentileThreshold,
      durationMin,
      durationMax,
      termFilters,
      chartType,
    } = resources.params.body;

    // only the transaction latency distribution chart can use metrics data
    const searchAggregatedTransactions =
      chartType === LatencyDistributionChartType.transactionLatency
        ? await getSearchTransactionsEvents({
            config: resources.config,
            apmEventClient,
            kuery,
            start,
            end,
          })
        : false;

    return getOverallLatencyDistribution({
      apmEventClient,
      chartType,
      environment,
      kuery,
      start,
      end,
      query: {
        bool: {
          filter: [
            ...termQuery(SERVICE_NAME, serviceName),
            ...termQuery(TRANSACTION_TYPE, transactionType),
            ...termQuery(TRANSACTION_NAME, transactionName),
            ...(termFilters?.flatMap((fieldValuePair): QueryDslQueryContainer[] =>
              termQuery(fieldValuePair.fieldName, fieldValuePair.fieldValue)
            ) ?? []),
          ],
        },
      },
      percentileThreshold,
      durationMinOverride: durationMin,
      durationMaxOverride: durationMax,
      searchMetrics: searchAggregatedTransactions,
    });
  },
});

export const latencyDistributionRouteRepository = latencyOverallTransactionDistributionRoute;
