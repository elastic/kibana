/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { toNumberRt } from '@kbn/io-ts-utils';
import { termQuery } from '@kbn/observability-plugin/server';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { getOverallLatencyDistribution } from '../latency_distribution/get_overall_latency_distribution';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import { environmentRt, kueryRt, rangeRt } from '../default_api_types';
import { SERVICE_NAME, SPAN_NAME } from '../../../common/es_fields/apm';
import { latencyDistributionChartTypeRt } from '../../../common/latency_distribution_chart_types';
import { getApmEventClient } from '../../lib/helpers/get_apm_event_client';
import type { OverallLatencyDistributionResponse } from '../latency_distribution/types';

const latencyOverallSpanDistributionRoute = createApmServerRoute({
  endpoint: 'POST /internal/apm/latency/overall_distribution/spans',
  params: t.type({
    body: t.intersection([
      t.partial({
        serviceName: t.string,
        spanName: t.string,
        transactionId: t.string,
        termFilters: t.array(
          t.type({
            fieldName: t.string,
            fieldValue: t.union([t.string, toNumberRt]),
          })
        ),
        durationMin: toNumberRt,
        durationMax: toNumberRt,
        isOtel: t.boolean,
      }),
      environmentRt,
      kueryRt,
      rangeRt,
      t.type({
        percentileThreshold: toNumberRt,
        chartType: latencyDistributionChartTypeRt,
      }),
    ]),
  }),
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<OverallLatencyDistributionResponse> => {
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
