/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import {
  SPAN_DURATION,
  TRANSACTION_DURATION,
} from '../../../../common/es_fields/apm';
import type { CommonCorrelationsQueryParams } from '../../../../common/correlations/types';
import { getCommonCorrelationsQuery } from './get_common_correlations_query';
import { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';

export const fetchDurationCorrelation = async ({
  apmEventClient,
  eventType,
  start,
  end,
  environment,
  kuery,
  query,
  expectations,
  ranges,
  fractions,
  totalDocCount,
}: CommonCorrelationsQueryParams & {
  apmEventClient: APMEventClient;
  eventType: ProcessorEvent;
  expectations: number[];
  ranges: estypes.AggregationsAggregationRange[];
  fractions: number[];
  totalDocCount: number;
}): Promise<{
  ranges: unknown[];
  correlation: number | null;
  ksTest: number | null;
}> => {
  const resp = await apmEventClient.search('get_duration_correlation', {
    apm: {
      events: [eventType],
    },
    body: {
      track_total_hits: false,
      size: 0,
      query: getCommonCorrelationsQuery({
        start,
        end,
        environment,
        kuery,
        query,
      }),
      aggs: {
        latency_ranges: {
          range: {
            field:
              eventType === ProcessorEvent.span
                ? SPAN_DURATION
                : TRANSACTION_DURATION,
            ranges,
          },
        },
        // Pearson correlation value
        duration_correlation: {
          bucket_correlation: {
            buckets_path: 'latency_ranges>_count',
            function: {
              count_correlation: {
                indicator: {
                  fractions,
                  expectations,
                  doc_count: totalDocCount,
                },
              },
            },
          },
        },
        // KS test p value = ks_test.less
        ks_test: {
          bucket_count_ks_test: {
            fractions,
            buckets_path: 'latency_ranges>_count',
            alternative: ['less', 'greater', 'two_sided'],
          },
        },
      },
    },
  });

  const { aggregations } = resp;

  const result = {
    ranges: aggregations?.latency_ranges.buckets ?? [],
    correlation: aggregations?.duration_correlation.value ?? null,
    ksTest: aggregations?.ks_test.less ?? null,
  };

  return result;
};
