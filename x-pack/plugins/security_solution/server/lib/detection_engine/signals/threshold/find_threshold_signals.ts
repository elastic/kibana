/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AggregationsCompositeAggregate,
  AggregationsMultiBucketAggregateBase,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { TIMESTAMP } from '@kbn/rule-data-utils';
import {
  AlertInstanceContext,
  AlertInstanceState,
  RuleExecutorServices,
} from '@kbn/alerting-plugin/server';
import { Logger } from '@kbn/core/server';

import {
  ThresholdNormalized,
  ThresholdWithCardinality,
  TimestampOverrideOrUndefined,
} from '../../../../../common/detection_engine/schemas/common/schemas';
import { BuildRuleMessage } from '../rule_messages';
import { singleSearchAfter } from '../single_search_after';
import {
  buildThresholdMultiBucketAggregation,
  // buildThresholdSingleBucketAggregation,
} from './build_threshold_aggregation';
import { ThresholdAggregationResult, ThresholdBucket } from './types';

interface FindThresholdSignalsParams {
  from: string;
  to: string;
  maxSignals: number;
  inputIndexPattern: string[];
  services: RuleExecutorServices<AlertInstanceState, AlertInstanceContext, 'default'>;
  logger: Logger;
  filter: unknown;
  threshold: ThresholdNormalized;
  buildRuleMessage: BuildRuleMessage;
  timestampOverride: TimestampOverrideOrUndefined;
}

const hasThresholdFields = (threshold: ThresholdNormalized) => !!threshold.field.length;

const isCompositeAggregate = (
  aggregate: AggregationsMultiBucketAggregateBase | undefined
): aggregate is AggregationsCompositeAggregate => aggregate != null && 'after_key' in aggregate;

// TODO: this is a dupe
const shouldFilterByCardinality = (
  threshold: ThresholdNormalized
): threshold is ThresholdWithCardinality => !!threshold.cardinality?.length;

interface SearchAfterResults {
  searchDurations: string[];
  searchErrors: string[];
}

export const findThresholdSignals = async ({
  from,
  to,
  maxSignals,
  inputIndexPattern,
  services,
  logger,
  filter,
  threshold,
  buildRuleMessage,
  timestampOverride,
}: FindThresholdSignalsParams): Promise<{
  buckets: ThresholdBucket[];
  searchDurations: string[];
  searchErrors: string[];
}> => {
  // Leaf aggregations used below
  let sortKeys;
  const buckets: ThresholdBucket[] = [];
  const searchAfterResults: SearchAfterResults = {
    searchDurations: [],
    searchErrors: [],
  };

  const compareBuckets = (bucket1: ThresholdBucket, bucket2: ThresholdBucket) =>
    shouldFilterByCardinality(threshold)
      ? // cardinality - descending
        (bucket2.cardinality_count?.value ?? 0) - (bucket1.cardinality_count?.value ?? 0)
      : // max_timestamp - ascending
        (bucket1.max_timestamp.value ?? 0) - (bucket2.max_timestamp.value ?? 0);

  if (hasThresholdFields(threshold)) {
    do {
      const { searchResult, searchDuration, searchErrors } = await singleSearchAfter({
        aggregations: buildThresholdMultiBucketAggregation({
          threshold,
          timestampField: timestampOverride != null ? timestampOverride : TIMESTAMP,
          sortKeys,
        }),
        searchAfterSortId: undefined,
        timestampOverride,
        index: inputIndexPattern,
        from,
        to,
        services,
        logger,
        // @ts-expect-error refactor to pass type explicitly instead of unknown
        filter,
        pageSize: 0,
        sortOrder: 'desc',
        buildRuleMessage,
      });
      const searchResultWithAggs = searchResult as ThresholdAggregationResult;
      if (!searchResultWithAggs.aggregations) {
        throw new Error('expected to find aggregations on search result');
      }

      searchAfterResults.searchDurations.push(searchDuration);
      searchAfterResults.searchErrors.push(...searchErrors);

      const thresholdTerms = searchResultWithAggs.aggregations?.thresholdTerms;

      sortKeys = isCompositeAggregate(thresholdTerms) ? thresholdTerms.after_key : undefined;
      buckets.push(
        ...(searchResultWithAggs.aggregations.thresholdTerms.buckets as ThresholdBucket[])
      );
    } while (sortKeys); // we have to iterate over everything in order to sort
  } else {
    // TODO: handle the single-bucket case
  }

  buckets.sort(compareBuckets);

  return {
    buckets: buckets.slice(0, maxSignals),
    ...searchAfterResults,
  };
};
