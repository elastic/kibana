/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { AggregationsAutoDateHistogramAggregation } from '@elastic/elasticsearch/lib/api/types';
import type { QueryDslQueryContainer } from '@kbn/data-views-plugin/common/types';
import type { AggregateOfMap, ChangePointType } from '@kbn/es-types/src/search';
import type { ObservabilityAIAssistantElasticsearchClient } from '../../clients/elasticsearch';

type MetricType = 'min' | 'max' | 'sum' | 'count' | 'avg' | 'p95' | 'p99';

function getMetricAggregation({ field, type }: { field?: string; type: MetricType }) {
  if (type === 'count') {
    return field
      ? {
          value_count: {
            field,
          },
        }
      : {
          filter: {
            match_all: {},
          },
          bucket_path: '_count',
        };
  }

  if (!field) {
    throw new Error(`Metric type ${type} needs a field to aggregate over`);
  }

  if (type === 'min' || 'max' || 'sum' || 'avg') {
    return {
      [type]: {
        field,
      },
    } as Record<Exclude<MetricType, 'count' | 'p95' | 'p99'>, { field: string }>;
  }

  const percentile = `${type.split('p')[1]}.0`;

  return {
    percentiles: {
      field,
      percents: [Number(percentile)],
      keyed: true,
    },
    bucket_path: percentile,
  };
}

export async function getMetricChanges({
  index,
  filters,
  groupBy,
  field,
  type,
  client,
  dateHistogram,
}: {
  index: string;
  filters: QueryDslQueryContainer[];
  groupBy: string[];
  field?: string;
  type: MetricType;
  client: ObservabilityAIAssistantElasticsearchClient;
  dateHistogram: AggregationsAutoDateHistogramAggregation;
}) {
  const metricAgg = getMetricAggregation({
    type,
    field,
  });

  const groupAgg = groupBy.length
    ? groupBy.length === 1
      ? { terms: { field: groupBy[0] } }
      : {
          multi_terms: {
            terms: groupBy.map((groupingField) => ({ field: groupingField })),
            size: 10,
          },
        }
    : {
        filters: {
          filters: [
            {
              match_all: {},
            },
          ],
        },
      };

  const subAggs = {
    over_time: {
      auto_date_histogram: dateHistogram,
      aggs: {
        metric: metricAgg,
        value: {
          bucket_script: {
            buckets_path: {
              metric: `metric${'buckets_path' in metricAgg ? `>${metricAgg.buckets_path}` : ''}`,
            },
            script: 'params.metric',
          },
        },
      },
    },
    changes: {
      change_point: {
        buckets_path: 'over_time>value',
      },
    },
  };

  const response = await client.search('get_metric_changes', {
    index,
    size: 0,
    track_total_hits: false,
    query: {
      bool: {
        filter: filters,
      },
    },
    aggregations: {
      groups: {
        ...groupAgg,
        aggs: subAggs,
      },
    },
  });

  const groups = (response.aggregations?.groups.buckets || []) as Array<
    AggregateOfMap<typeof subAggs, unknown> & { key?: string; key_as_string?: string }
  >;

  const series = groups.map((group) => {
    const key = group.key ?? 'all';

    return {
      key,
      over_time: group.over_time.buckets.map((bucket) => {
        return {
          x: new Date(bucket.key_as_string).getTime(),
          y: bucket.value?.value as number | null,
        };
      }),
      changes:
        group.changes.type.indeterminable || !group.changes.bucket?.key
          ? { type: 'indeterminable' as ChangePointType }
          : {
              time: new Date(group.changes.bucket.key).toISOString(),
              type: Object.keys(group.changes.type)[0] as keyof typeof group.changes.type,
              ...Object.values(group.changes.type)[0],
            },
    };
  });

  return series;
}
