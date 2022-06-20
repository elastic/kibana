/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TIMESTAMP } from '@kbn/rule-data-utils';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

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
  buildThresholdSingleBucketAggregation,
  // buildThresholdSingleBucketAggregation,
} from './build_threshold_aggregation';
import {
  ThresholdMultiBucketAggregationResult,
  ThresholdBucket,
  ThresholdSingleBucketAggregationResult,
} from './types';

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
  runtimeMappings: estypes.MappingRuntimeFields | undefined;
}

const hasThresholdFields = (threshold: ThresholdNormalized) => !!threshold.field.length;

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
  runtimeMappings,
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

<<<<<<< HEAD
  const includeCardinalityFilter = shouldFilterByCardinality(threshold);

  const compareBuckets = (bucket1: ThresholdBucket, bucket2: ThresholdBucket) =>
    includeCardinalityFilter
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

      const searchResultWithAggs = searchResult as ThresholdMultiBucketAggregationResult;
      if (!searchResultWithAggs.aggregations) {
        throw new Error('expected to find aggregations on search result');
      }

      searchAfterResults.searchDurations.push(searchDuration);
      searchAfterResults.searchErrors.push(...searchErrors);

      const thresholdTerms = searchResultWithAggs.aggregations?.thresholdTerms;
      sortKeys = thresholdTerms.after_key;

      // sortKeys = isCompositeAggregate(thresholdTerms) ? thresholdTerms.after_key : undefined;

      buckets.push(
        ...(searchResultWithAggs.aggregations.thresholdTerms.buckets as ThresholdBucket[])
      );
    } while (sortKeys); // we have to iterate over everything in order to sort

    buckets.sort(compareBuckets);
  } else {
    const { searchResult, searchDuration, searchErrors } = await singleSearchAfter({
      aggregations: buildThresholdSingleBucketAggregation({
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
      trackTotalHits: true,
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
=======
  const thresholdFields = threshold.field;

  // order buckets by cardinality (https://github.com/elastic/kibana/issues/95258)
  const thresholdFieldCount = thresholdFields.length;
  const orderByCardinality = (i: number = 0) =>
    (thresholdFieldCount === 0 || i === thresholdFieldCount - 1) && threshold.cardinality?.length
      ? { order: { cardinality_count: 'desc' } }
      : {};

  // Generate a nested terms aggregation for each threshold grouping field provided, appending leaf
  // aggregations to 1) filter out buckets that don't meet the cardinality threshold, if provided, and
  // 2) return the latest hit for each bucket so that we can persist the timestamp of the event in the
  // `original_time` of the signal. This will be used for dupe mitigation purposes by the detection
  // engine.
  const aggregations = thresholdFields.length
    ? thresholdFields.reduce((acc, field, i) => {
        const aggPath = [...Array(i + 1).keys()]
          .map((j) => {
            return `['threshold_${j}:${thresholdFields[j]}']`;
          })
          .join(`['aggs']`);
        set(acc, aggPath, {
          terms: {
            field,
            ...orderByCardinality(i),
            min_doc_count: threshold.value, // not needed on parent agg, but can help narrow down result set
            size: 10000, // max 10k buckets
          },
        });
        if (i === (thresholdFields.length ?? 0) - 1) {
          set(acc, `${aggPath}['aggs']`, leafAggs);
        }
        return acc;
      }, {})
    : {
        // No threshold grouping fields provided
        threshold_0: {
          terms: {
            script: {
              source: '""', // Group everything in the same bucket
              lang: 'painless',
            },
            ...orderByCardinality(),
            min_doc_count: threshold.value,
          },
          aggs: leafAggs,
        },
      };

  return singleSearchAfter({
    aggregations,
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
    runtimeMappings,
  });
>>>>>>> 64f0d65037cd3cef06211d132e109309dad81384
};
