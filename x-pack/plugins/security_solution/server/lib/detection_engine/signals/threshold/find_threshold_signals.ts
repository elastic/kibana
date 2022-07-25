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
import type { Logger } from '@kbn/core/server';
import type { ESBoolQuery } from '../../../../../common/typed_json';

import type {
  ThresholdNormalized,
  TimestampOverride,
  TimestampOverrideOrUndefined,
} from '../../../../../common/detection_engine/schemas/common/schemas';
import type { BuildRuleMessage } from '../rule_messages';
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

interface FindThresholdSignalsParams {
  from: string;
  to: string;
  maxSignals: number;
  inputIndexPattern: string[];
  services: RuleExecutorServices<AlertInstanceState, AlertInstanceContext, 'default'>;
  logger: Logger;
  filter: ESBoolQuery;
  threshold: ThresholdNormalized;
  buildRuleMessage: BuildRuleMessage;
  runtimeMappings: estypes.MappingRuntimeFields | undefined;
  primaryTimestamp: TimestampOverride;
  secondaryTimestamp: TimestampOverrideOrUndefined;
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
  logger,
  filter,
  threshold,
  buildRuleMessage,
  runtimeMappings,
  primaryTimestamp,
  secondaryTimestamp,
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
          timestampField: primaryTimestamp,
          sortKeys,
        }),
        index: inputIndexPattern,
        searchAfterSortIds: undefined,
        from,
        to,
        services,
        logger,
        filter,
        pageSize: 0,
        sortOrder: 'desc',
        buildRuleMessage,
        runtimeMappings,
        primaryTimestamp,
        secondaryTimestamp,
      });

      const searchResultWithAggs = searchResult as ThresholdMultiBucketAggregationResult;
      if (!searchResultWithAggs.aggregations) {
        throw new Error('expected to find aggregations on search result');
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
        timestampField: primaryTimestamp,
      }),
      searchAfterSortIds: undefined,
      index: inputIndexPattern,
      from,
      to,
      services,
      logger,
      filter,
      pageSize: 0,
      sortOrder: 'desc',
      buildRuleMessage,
      trackTotalHits: true,
      runtimeMappings,
      primaryTimestamp,
      secondaryTimestamp,
    });

    const searchResultWithAggs = searchResult as ThresholdSingleBucketAggregationResult;
    if (!searchResultWithAggs.aggregations) {
      throw new Error('expected to find aggregations on search result');
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
