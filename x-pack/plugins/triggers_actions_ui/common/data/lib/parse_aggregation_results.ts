/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SearchResponse,
  AggregationsSingleMetricAggregateBase,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

export interface ParsedAggregationGroup {
  group: string;
  count: number;
  value?: number;
}

interface ParseAggregationResultsOpts {
  isCountAgg: boolean;
  isGroupAgg: boolean;
  esResult: SearchResponse<unknown>;
}
export const parseAggregationResults = ({
  isCountAgg,
  isGroupAgg,
  esResult,
}: ParseAggregationResultsOpts): ParsedAggregationGroup[] => {
  const aggregations = esResult?.aggregations || {};

  // add a fake 'all documents' group aggregation, if a group aggregation wasn't used
  if (!isGroupAgg) {
    aggregations.groupAgg = {
      buckets: [
        {
          key: 'all documents',
          doc_count: esResult.hits.total ?? 0,
          ...(!isCountAgg
            ? {
                metricAgg: {
                  value:
                    (aggregations.metricAgg as AggregationsSingleMetricAggregateBase)?.value ?? 0,
                },
              }
            : {}),
        },
      ],
    };
  }

  // @ts-expect-error specify aggregations type explicitly
  const groupBuckets = aggregations.groupAgg?.buckets || [];
  // @ts-expect-error specify aggregations type explicitly
  const numGroupsTotal = aggregations.groupAggCount?.count ?? 0;
  const results: ParsedAggregationGroup[] = [];

  for (const groupBucket of groupBuckets) {
    const groupName: string = `${groupBucket?.key}`;
    const groupResult: any = {
      group: groupName,
      count: groupBucket?.doc_count,
      ...(!isCountAgg ? { value: groupBucket?.metricAgg?.value } : {}),
    };
    results.push(groupResult);
  }

  return results;
};
