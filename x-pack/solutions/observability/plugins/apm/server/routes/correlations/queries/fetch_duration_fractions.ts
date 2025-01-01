/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { CommonCorrelationsQueryParams } from '../../../../common/correlations/types';
import { SPAN_DURATION, TRANSACTION_DURATION } from '../../../../common/es_fields/apm';
import { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
import { getCommonCorrelationsQuery } from './get_common_correlations_query';

/**
 * Compute the actual percentile bucket counts and actual fractions
 */
export const fetchDurationFractions = async ({
  apmEventClient,
  eventType,
  start,
  end,
  environment,
  kuery,
  query,
  ranges,
}: CommonCorrelationsQueryParams & {
  apmEventClient: APMEventClient;
  eventType: ProcessorEvent;
  ranges: estypes.AggregationsAggregationRange[];
}): Promise<{ fractions: number[]; totalDocCount: number }> => {
  const resp = await apmEventClient.search('get_duration_fractions', {
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
            field: eventType === ProcessorEvent.span ? SPAN_DURATION : TRANSACTION_DURATION,
            ranges,
          },
        },
      },
    },
  });

  const { aggregations } = resp;

  const totalDocCount =
    aggregations?.latency_ranges.buckets.reduce((acc, bucket) => {
      return acc + bucket.doc_count;
    }, 0) ?? 0;

  // Compute (doc count per bucket/total doc count)
  return {
    fractions:
      aggregations?.latency_ranges.buckets.map((bucket) => bucket.doc_count / totalDocCount) ?? [],
    totalDocCount,
  };
};
