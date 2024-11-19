/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AggregationsAutoDateHistogramAggregation } from '@elastic/elasticsearch/lib/api/types';
import type { QueryDslQueryContainer } from '@kbn/data-views-plugin/common/types';
import type { ChangePointType } from '@kbn/es-types/src';
import type { ObservabilityAIAssistantElasticsearchClient } from '../../clients/elasticsearch';

export async function getLogChanges({
  index,
  filters,
  field,
  client,
  dateHistogram,
}: {
  index: string;
  filters: QueryDslQueryContainer[];
  field: string;
  client: ObservabilityAIAssistantElasticsearchClient;
  dateHistogram: AggregationsAutoDateHistogramAggregation;
}) {
  const countDocumentsResponse = await client.search('get_log_count', {
    size: 0,
    track_total_hits: true,
    index,
    query: {
      bool: {
        filter: filters,
      },
    },
  });

  if (countDocumentsResponse.hits.total.value === 0) {
    return [];
  }

  const probability = Math.min(1, 500_000 / countDocumentsResponse.hits.total.value);

  const response = await client.search('get_log_changes', {
    index,
    size: 0,
    track_total_hits: false,
    query: {
      bool: {
        filter: filters,
      },
    },
    aggregations: {
      sampler: {
        random_sampler: {
          probability: probability > 0.5 ? 1 : probability,
        },
        aggs: {
          groups: {
            categorize_text: {
              field,
              size: 1000,
            },
            aggs: {
              over_time: {
                auto_date_histogram: dateHistogram,
              },
              changes: {
                change_point: {
                  buckets_path: 'over_time>_count',
                },
              },
            },
          },
        },
      },
    },
  });

  return (
    response.aggregations?.sampler.groups.buckets.map((group) => {
      return {
        key: group.key,
        pattern: group.regex,
        over_time: group.over_time.buckets.map((bucket) => ({
          x: new Date(bucket.key).getTime(),
          y: bucket.doc_count,
        })),
        changes:
          group.changes.type.indeterminable || !group.changes.bucket?.key
            ? { type: 'indeterminable' as ChangePointType }
            : {
                time: new Date(group.changes.bucket.key).toISOString(),
                type: Object.keys(group.changes.type)[0] as keyof typeof group.changes.type,
                ...Object.values(group.changes.type)[0],
              },
      };
    }) ?? []
  );
}
