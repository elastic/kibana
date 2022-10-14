/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import type {
  AlertInstanceContext,
  AlertInstanceState,
  RuleExecutorServices,
} from '@kbn/alerting-plugin/server';
import type { ESBoolQuery } from '../../../../../common/typed_json';

import type { TimestampOverride } from '../../../../../common/detection_engine/rule_schema';
import type { ThresholdNormalized } from '../../../../../common/detection_engine/schemas/common/schemas';
import { singleSearchAfter } from '../single_search_after';
import {
  buildThresholdMultiBucketAggregation,
  buildThresholdSingleBucketAggregation,
} from './build_threshold_aggregation';
import type {
  ThresholdMultiBucketAggregationResult,
  ThresholdBucket,
  ThresholdSingleBucketAggregationResult,
} from './types';
import { shouldFilterByCardinality } from './utils';
import type { IRuleExecutionLogForExecutors } from '../../rule_monitoring';

interface FindThresholdSignalsParams {
  from: string;
  to: string;
  maxSignals: number;
  inputIndexPattern: string[];
  services: RuleExecutorServices<AlertInstanceState, AlertInstanceContext, 'default'>;
  ruleExecutionLogger: IRuleExecutionLogForExecutors;
  filter: ESBoolQuery;
  threshold: ThresholdNormalized;
  runtimeMappings: estypes.MappingRuntimeFields | undefined;
  primaryTimestamp: TimestampOverride;
  secondaryTimestamp: TimestampOverride | undefined;
  aggregatableTimestampField: string;
}

const hasThresholdFields = (threshold: ThresholdNormalized) => !!threshold.field.length;

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
  ruleExecutionLogger,
  filter,
  threshold,
  runtimeMappings,
  primaryTimestamp,
  secondaryTimestamp,
  aggregatableTimestampField,
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

  const includeCardinalityFilter = shouldFilterByCardinality(threshold);

  if (hasThresholdFields(threshold)) {
    do {
      const { searchResult, searchDuration, searchErrors } = await singleSearchAfter({
        aggregations: buildThresholdMultiBucketAggregation({
          threshold,
          aggregatableTimestampField,
          sortKeys,
        }),
        index: inputIndexPattern,
        searchAfterSortIds: undefined,
        from,
        to,
        services,
        ruleExecutionLogger,
        filter,
        pageSize: 0,
        sortOrder: 'desc',
        runtimeMappings,
        primaryTimestamp,
        secondaryTimestamp,
      });

      const searchResultWithAggs = searchResult as ThresholdMultiBucketAggregationResult;
      if (!searchResultWithAggs.aggregations) {
        throw new Error('Aggregations were missing on threshold rule search result');
      }

      searchAfterResults.searchDurations.push(searchDuration);
      searchAfterResults.searchErrors.push(...searchErrors);

      const thresholdTerms = searchResultWithAggs.aggregations?.thresholdTerms;
      sortKeys = thresholdTerms.after_key;

      buckets.push(
        ...(searchResultWithAggs.aggregations.thresholdTerms.buckets as ThresholdBucket[])
      );
    } while (sortKeys && buckets.length <= maxSignals);
  } else {
    const { searchResult, searchDuration, searchErrors } = await singleSearchAfter({
      aggregations: buildThresholdSingleBucketAggregation({
        threshold,
        aggregatableTimestampField,
      }),
      searchAfterSortIds: undefined,
      index: inputIndexPattern,
      from,
      to,
      services,
      ruleExecutionLogger,
      filter,
      pageSize: 0,
      sortOrder: 'desc',
      trackTotalHits: true,
      runtimeMappings,
      primaryTimestamp,
      secondaryTimestamp,
    });

    const searchResultWithAggs = searchResult as ThresholdSingleBucketAggregationResult;
    if (!searchResultWithAggs.aggregations) {
      throw new Error('Aggregations were missing on threshold rule search result');
    }

    searchAfterResults.searchDurations.push(searchDuration);
    searchAfterResults.searchErrors.push(...searchErrors);

    const docCount = searchResultWithAggs.hits.total.value;
    if (
      docCount >= threshold.value &&
      (!includeCardinalityFilter ||
        (searchResultWithAggs.aggregations.cardinality_count?.value ?? 0) >=
          threshold.cardinality[0].value)
    ) {
      buckets.push({
        doc_count: docCount,
        key: {},
        max_timestamp: searchResultWithAggs.aggregations.max_timestamp,
        min_timestamp: searchResultWithAggs.aggregations.min_timestamp,
        ...(includeCardinalityFilter
          ? { cardinality_count: searchResultWithAggs.aggregations.cardinality_count }
          : {}),
      });
    }
  }

  return {
    buckets: buckets.slice(0, maxSignals),
    ...searchAfterResults,
  };
};
