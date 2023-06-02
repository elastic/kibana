/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SearchResponse,
  SearchHit,
  SearchHitsMetadata,
  AggregationsSingleMetricAggregateBase,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

export const UngroupedGroupId = 'all documents';
export interface ParsedAggregationGroup {
  group: string;
  count: number;
  hits: Array<SearchHit<unknown>>;
  value?: number;
}

export interface ParsedAggregationResults {
  results: ParsedAggregationGroup[];
  truncated: boolean;
}

interface ParseAggregationResultsOpts {
  isCountAgg: boolean;
  isGroupAgg: boolean;
  esResult: SearchResponse<unknown>;
  resultLimit?: number;
}
export const parseAggregationResults = ({
  isCountAgg,
  isGroupAgg,
  esResult,
  resultLimit,
}: ParseAggregationResultsOpts): ParsedAggregationResults => {
  const aggregations = esResult?.aggregations || {};

  // add a fake 'all documents' group aggregation, if a group aggregation wasn't used
  if (!isGroupAgg) {
    aggregations.groupAgg = {
      buckets: [
        {
          key: UngroupedGroupId,
          doc_count: totalHitsToNumber(esResult.hits.total),
          topHitsAgg: {
            hits: {
              hits: esResult.hits.hits ?? [],
            },
          },
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
  const results: ParsedAggregationResults = {
    results: [],
    truncated: resultLimit ? numGroupsTotal > resultLimit : false,
  };

  for (const groupBucket of groupBuckets) {
    if (resultLimit && results.results.length === resultLimit) break;

    const groupName: string = `${groupBucket?.key}`;
    const groupResult: any = {
      group: groupName,
      count: groupBucket?.doc_count,
      hits: groupBucket?.topHitsAgg?.hits?.hits ?? [],
      ...(!isCountAgg ? { value: groupBucket?.metricAgg?.value } : {}),
    };
    results.results.push(groupResult);
  }

  return results;
};

function totalHitsToNumber(total: SearchHitsMetadata['total']): number {
  return typeof total === 'number' ? total : total?.value ?? 0;
}
