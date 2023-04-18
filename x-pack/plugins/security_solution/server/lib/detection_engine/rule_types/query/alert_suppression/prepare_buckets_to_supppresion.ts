/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';

import type { AggregationsCompositeBucket } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import { AlertSuppressionMissingFieldsStrategy } from '../../../../../../common/detection_engine/constants';
import type { AlertSuppressionMissingFields } from '../../../../../../common/detection_engine/rule_schema';
import { partitionBucketsWithNullValues } from './partition_buckets_with_null_values';
import type { SingleSearchAfterParams } from '../../utils/single_search_after';
import { singleSearchAfter } from '../../utils/single_search_after';
import { buildGroupByFieldAggregation } from './build_group_by_field_aggregation';
import type { EventGroupingMultiBucketAggregationResult } from './build_group_by_field_aggregation';

type PrepareSuppressionBuckets = (params: {
  strategy?: AlertSuppressionMissingFields;
  buckets: AggregationsCompositeBucket[];
  searchParams: SingleSearchAfterParams;
  groupByFields: string[];
  maxSignals: number;
  aggregatableTimestampField: string;
}) => Promise<AggregationsCompositeBucket[]>;

/**
 * prepares array of buckets depends on suppression missing fields strategy {@link AlertSuppressionMissingFieldsStrategy}
 * @param param0.strategy
 * @param param0.buckets
 */
export const prepareBucketsToSuppression: PrepareSuppressionBuckets = async ({
  strategy,
  buckets,
  searchParams,
  groupByFields,
  maxSignals,
  aggregatableTimestampField,
}) => {
  // no changes needed if no strategy specified or it is SingleAlertForAllDocuments
  if (!strategy || strategy === AlertSuppressionMissingFieldsStrategy.SingleAlertForAllDocuments) {
    return buckets;
  }

  const [bucketsWithValues, bucketsWithMissingValues] = partitionBucketsWithNullValues(buckets);

  // if there are no buckets with missing values, return all buckets
  if (bucketsWithMissingValues.length === 0) {
    return buckets;
  }

  const groupingAggregation = buildGroupByFieldAggregation({
    groupByFields,
    maxSignals: maxSignals - bucketsWithValues.length,
    aggregatableTimestampField,
    topHitsSize: 100,
  });

  const { searchResult } = (await singleSearchAfter({
    ...searchParams,
    aggregations: groupingAggregation,
    additionalFilters: [
      ...(searchParams.additionalFilters || []),
      ...buildExcludeDocsWithValuesFilter(groupByFields),
    ],
  })) as { searchResult: EventGroupingMultiBucketAggregationResult };

  if (!searchResult.aggregations) {
    return buckets;
  }

  const resultBuckets = searchResult.aggregations.eventGroups.buckets;

  const flattenedBuckets = resultBuckets.flatMap((bucket) =>
    bucket.topHits.hits.hits.map((hit) => {
      const total = bucket.topHits.hits.total;
      return {
        ...bucket,
        doc_count: 1,
        topHits: { ...bucket.topHits, hits: { total: { ...total, value: 1 }, hits: [hit] } },
      };
    })
  );
  return [...bucketsWithValues, ...flattenedBuckets];
};

/**
 * builds filter that excludes from result all docs that have value for groupByFields
 * @param groupByFields
 * @returns
 */
const buildExcludeDocsWithValuesFilter = (groupByFields: string[]): QueryDslQueryContainer[] => {
  if (groupByFields.length === 0) {
    return [];
  }
  return [
    {
      bool: {
        must_not: groupByFields.map((field) => ({
          exists: {
            field,
          },
        })),
      },
    },
  ];
};
