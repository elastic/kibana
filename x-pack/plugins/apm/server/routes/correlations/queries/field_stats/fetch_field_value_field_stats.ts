/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProcessorEvent } from '@kbn/observability-plugin/common';
import {
  AggregationsAggregationContainer,
  AggregationsSamplerAggregate,
  AggregationsSingleBucketAggregateBase,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import {
  CommonCorrelationsQueryParams,
  FieldValuePair,
} from '../../../../../common/correlations/types';
import {
  FieldValueFieldStats,
  TopValueBucket,
} from '../../../../../common/correlations/field_stats_types';
import { getCommonCorrelationsQuery } from '../get_common_correlations_query';
import { APMEventClient } from '../../../../lib/helpers/create_es_client/create_apm_event_client';

export const fetchFieldValueFieldStats = async ({
  apmEventClient,
  eventType,
  start,
  end,
  environment,
  kuery,
  query,
  field,
  samplerShardSize,
}: CommonCorrelationsQueryParams & {
  eventType: ProcessorEvent;
  apmEventClient: APMEventClient;
  field: FieldValuePair;
  samplerShardSize?: number;
}): Promise<FieldValueFieldStats> => {
  const shouldSample = samplerShardSize !== undefined && samplerShardSize > 0;

  let aggs: Record<string, AggregationsAggregationContainer> = {
    filtered_count: {
      filter: {
        term: {
          [`${field?.fieldName}`]: field?.fieldValue,
        },
      },
    },
  };

  if (shouldSample) {
    aggs = {
      sample: {
        sampler: {
          shard_size: samplerShardSize,
        },
        aggs: {
          filtered_count: {
            filter: {
              term: {
                [`${field?.fieldName}`]: field?.fieldValue,
              },
            },
          },
        },
      },
    };
  }
  const { aggregations } = await apmEventClient.search(
    'get_field_value_field_stats',
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
        aggs,
      },
    }
  );

  const results = (
    shouldSample
      ? (aggregations?.sample as AggregationsSamplerAggregate)?.filtered_count
      : aggregations?.filtered_count
  ) as AggregationsSingleBucketAggregateBase;

  const topValues: TopValueBucket[] = [
    {
      key: field.fieldValue,
      doc_count: (results.doc_count as number) ?? 0,
    },
  ];

  const stats = {
    fieldName: field.fieldName,
    topValues,
    topValuesSampleSize:
      (aggregations?.sample as AggregationsSamplerAggregate)?.doc_count ?? 0,
  };

  return stats;
};
