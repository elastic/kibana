/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { termQuery } from '@kbn/observability-plugin/server';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { routeDefinitions, type LatencyOverallSpanDistributionResponse } from '@kbn/apm-api-shared';
import { getOverallLatencyDistribution } from '../latency_distribution/get_overall_latency_distribution';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import { SERVICE_NAME, SPAN_NAME } from '../../../common/es_fields/apm';
import { getApmEventClient } from '../../lib/helpers/get_apm_event_client';

const latencyOverallSpanDistributionRoute = createApmServerRoute({
  endpoint: routeDefinitions.latencyDistribution.overallSpanDistribution.endpoint,
  params: routeDefinitions.latencyDistribution.overallSpanDistribution.params,
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<LatencyOverallSpanDistributionResponse> => {
    const apmEventClient = await getApmEventClient(resources);

    const {
      environment,
      kuery,
      serviceName,
      spanName,
      start,
      end,
      percentileThreshold,
      durationMin,
      durationMax,
      termFilters,
      chartType,
      isOtel = false,
    } = resources.params.body;

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
            ...termQuery(SPAN_NAME, spanName),
            ...(termFilters?.flatMap((fieldValuePair): QueryDslQueryContainer[] =>
              termQuery(fieldValuePair.fieldName, fieldValuePair.fieldValue)
            ) ?? []),
          ],
        },
      },
      percentileThreshold,
      durationMinOverride: durationMin,
      durationMaxOverride: durationMax,
      searchMetrics: false,
      isOtel,
    });
  },
});

export const spanLatencyDistributionRouteRepository = latencyOverallSpanDistributionRoute;
