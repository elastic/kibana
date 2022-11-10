/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import {
  NumericFieldStats,
  TopValueBucket,
} from '../../../../../common/correlations/field_stats_types';
import {
  CommonCorrelationsQueryParams,
  FieldValuePair,
} from '../../../../../common/correlations/types';
import { APMEventClient } from '../../../../lib/helpers/create_es_client/create_apm_event_client';
import { getCommonCorrelationsQuery } from '../get_common_correlations_query';

export const fetchNumericFieldStats = async ({
  apmEventClient,
  eventType,
  start,
  end,
  environment,
  kuery,
  query,
  field,
}: CommonCorrelationsQueryParams & {
  apmEventClient: APMEventClient;
  eventType: ProcessorEvent;
  field: FieldValuePair;
}): Promise<NumericFieldStats> => {
  const { fieldName } = field;

  const { aggregations } = await apmEventClient.search(
    'get_numeric_field_stats',
    {
      apm: {
        events: [eventType],
      },
      body: {
        size: 0,
        track_total_hits: false,
        query: getCommonCorrelationsQuery({
          start,
          end,
          environment,
          kuery,
          query,
        }),
        aggs: {
          sampled_field_stats: {
            filter: { exists: { field: fieldName } },
            aggs: {
              actual_stats: {
                stats: { field: fieldName },
              },
            },
          },
          sampled_top: {
            terms: {
              field: fieldName,
              size: 10,
              order: {
                _count: 'desc',
              },
            },
          },
        },
      },
    }
  );

  const docCount = aggregations?.sampled_field_stats?.doc_count ?? 0;
  const fieldStatsResp: Partial<estypes.AggregationsStatsAggregate> =
    aggregations?.sampled_field_stats?.actual_stats ?? {};
  const topValues = aggregations?.sampled_top?.buckets ?? [];

  const stats: NumericFieldStats = {
    fieldName: field.fieldName,
    count: docCount,
    min: fieldStatsResp?.min || 0,
    max: fieldStatsResp?.max || 0,
    avg: fieldStatsResp?.avg || 0,
    topValues,
    topValuesSampleSize: topValues.reduce(
      (acc: number, curr: TopValueBucket) => acc + curr.doc_count,
      aggregations?.sampled_top?.sum_other_doc_count ?? 0
    ),
  };

  return stats;
};
