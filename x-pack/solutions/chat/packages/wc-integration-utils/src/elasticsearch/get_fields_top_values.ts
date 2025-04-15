/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AggregationsStringTermsAggregate } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';

export const getFieldsTopValues = async ({
  indexName,
  fieldNames,
  esClient,
  maxSize = 20,
}: {
  indexName: string;
  fieldNames: string[];
  esClient: ElasticsearchClient;
  maxSize?: number;
}): Promise<Record<string, string[]>> => {
  const aggResult = await esClient.search({
    index: indexName,
    size: 0,
    aggs: Object.fromEntries(
      fieldNames.map((field) => [
        field,
        {
          terms: {
            field,
            size: maxSize,
          },
        },
      ])
    ),
  });

  const aggregations = aggResult.aggregations!;

  const topValues = fieldNames.reduce((map, fieldName) => {
    const aggr = aggregations[fieldName] as AggregationsStringTermsAggregate;

    if (aggr.buckets && Array.isArray(aggr.buckets)) {
      // key | doc_count
      const values = aggr.buckets.map((bucket) => bucket.key as string);
      map[fieldName] = values;
    }

    // aggr.buckets[0]

    return map;
  }, {} as Record<string, string[]>);

  return topValues;
};
