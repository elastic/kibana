/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SIGNIFICANT_VALUE_DIGITS } from '../../../../common/correlations/constants';
import { LatencyDistributionChartType } from '../../../../common/latency_distribution_chart_types';
import { getCommonCorrelationsQuery } from './get_common_correlations_query';
import { CommonCorrelationsQueryParams } from '../../../../common/correlations/types';
import { getDurationField, getEventType } from '../utils';
import { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
import { getDocumentTypeFilterForTransactions } from '../../../lib/helpers/transactions';

export const fetchDurationPercentiles = async ({
  chartType,
  apmEventClient,
  start,
  end,
  environment,
  kuery,
  query,
  percents,
  searchMetrics,
}: CommonCorrelationsQueryParams & {
  chartType: LatencyDistributionChartType;
  apmEventClient: APMEventClient;
  percents?: number[];
  searchMetrics: boolean;
}): Promise<{
  totalDocs: number;
  percentiles: Record<string, number>;
}> => {
  // when using metrics data, ensure we filter by docs with the appropriate duration field
  const filteredQuery = searchMetrics
    ? {
        bool: {
          filter: [query, ...getDocumentTypeFilterForTransactions(true)],
        },
      }
    : query;

  const params = {
    apm: { events: [getEventType(chartType, searchMetrics)] },
    body: {
      track_total_hits: true,
      query: getCommonCorrelationsQuery({
        start,
        end,
        environment,
        kuery,
        query: filteredQuery,
      }),
      size: 0,
      aggs: {
        duration_percentiles: {
          percentiles: {
            hdr: {
              number_of_significant_value_digits: SIGNIFICANT_VALUE_DIGITS,
            },
            field: getDurationField(chartType, searchMetrics),
            ...(Array.isArray(percents) ? { percents } : {}),
          },
        },
      },
    },
  };
  const response = await apmEventClient.search(
    'get_duration_percentiles',
    params
  );

  // return early with no results if the search didn't return any documents
  if (!response.aggregations || response.hits.total.value === 0) {
    return { totalDocs: 0, percentiles: {} };
  }

  return {
    totalDocs: response.hits.total.value,
    percentiles: (response.aggregations.duration_percentiles.values ??
      // we know values won't be null because there are hits
      {}) as Record<string, number>,
  };
};
