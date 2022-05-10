/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AggregateName,
  AggregationsCompositeAggregate,
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
import type { SignalSearchResponse } from '../types';
import {
  createSearchAfterReturnType,
  createSearchAfterReturnTypeFromResponse,
  createSearchResultReturnType,
  mergeReturns,
  mergeSearchResults,
} from '../utils';
import { ThresholdAggregate, ThresholdAggregationContainer } from './types';

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

const shouldFilterByCardinality = (
  threshold: ThresholdNormalized
): threshold is ThresholdWithCardinality => !!threshold.cardinality?.length;

const hasThresholdFields = (threshold: ThresholdNormalized) => !!threshold.field.length;

const isCompositeAggregate = (
  aggregate: ThresholdAggregate | undefined
): aggregate is AggregationsCompositeAggregate => aggregate != null && 'after_key' in aggregate;

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
  searchResult: SignalSearchResponse<Record<AggregateName, ThresholdAggregate>>;
  searchDuration: string;
  searchErrors: string[];
}> => {
  // Leaf aggregations used below
  const leafAggs = {
    max_timestamp: {
      max: {
        field: timestampOverride != null ? timestampOverride : TIMESTAMP,
      },
    },
    min_timestamp: {
      min: {
        field: timestampOverride != null ? timestampOverride : TIMESTAMP,
      },
    },
    ...(shouldFilterByCardinality(threshold)
      ? {
          cardinality_count: {
            cardinality: {
              field: threshold.cardinality[0].field,
            },
          },
          cardinality_check: {
            bucket_selector: {
              buckets_path: {
                cardinalityCount: 'cardinality_count',
              },
              script: `params.cardinalityCount >= ${threshold.cardinality[0].value}`, // TODO: select cardinality operator?
            },
          },
        }
      : {}),
    count_check: {
      bucket_selector: {
        buckets_path: {
          docCount: '_count',
        },
        script: `params.docCount >= ${threshold.value}`,
      },
    },
  };

  let sortKeys;
  let result = createSearchAfterReturnType<Record<AggregateName, ThresholdAggregate>>();
  let mergedSearchResults =
    createSearchResultReturnType<Record<AggregateName, ThresholdAggregate>>();

  do {
    // Generate a composite aggregation considering each threshold grouping field provided, appending leaf
    // aggregations to 1) filter out buckets that don't meet the cardinality threshold, if provided, and
    // 2) return the first and last hit for each bucket in order to eliminate dupes and reconstruct an accurate
    // timeline.
    const aggregations: ThresholdAggregationContainer = {
      thresholdTerms: hasThresholdFields(threshold)
        ? {
            composite: {
              sources: threshold.field.map((term, i) => ({
                [term]: {
                  terms: {
                    field: term,
                  },
                },
              })),
              after: sortKeys,
              size: 10000,
            },
            aggs: leafAggs,
          }
        : {
            terms: {
              script: {
                source: '""', // Group everything in the same bucket
                lang: 'painless',
              },
              min_doc_count: threshold.value,
              ...(shouldFilterByCardinality(threshold)
                ? { order: { cardinality_count: 'desc' } }
                : {}),
            },
            aggs: leafAggs,
          },
    };

    const { searchResult, searchDuration, searchErrors } = await singleSearchAfter<
      Record<string, ThresholdAggregate>
    >({
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
    });
    const thresholdTerms = searchResult.aggregations?.thresholdTerms;
    const prevThresholdTerms = mergedSearchResults.aggregations?.thresholdTerms;

    sortKeys = isCompositeAggregate(thresholdTerms) ? thresholdTerms.after_key : undefined;
    mergedSearchResults = mergeSearchResults([mergedSearchResults, searchResult]);

    if (prevThresholdTerms) {
      const prevBuckets = prevThresholdTerms?.buckets ?? [];
      const nextBuckets = thresholdTerms?.buckets ?? [];
      mergedSearchResults.aggregations = {
        thresholdTerms: {
          buckets: [...prevBuckets, ...nextBuckets],
        },
      };
      mergedSearchResults.hits.total = prevBuckets.length + nextBuckets.length;
    }

    result = mergeReturns([
      result,
      createSearchAfterReturnTypeFromResponse({
        searchResult: mergedSearchResults,
        timestampOverride,
      }),
      createSearchAfterReturnType({
        searchAfterTimes: [searchDuration],
        errors: searchErrors,
      }),
    ]);
  } while (sortKeys); // we have to iterate over everything in order to sort

  // TODO: sort by max_timestamp? sort by cardinality?

  // and then truncate to `maxSignals`
  if ((mergedSearchResults.hits.total ?? 0) > maxSignals) {
    mergedSearchResults.aggregations = {
      thresholdTerms: {
        buckets: (mergedSearchResults.aggregations?.thresholdTerms.buckets ?? []).slice(
          0,
          maxSignals
        ),
      },
    };
    mergedSearchResults.hits.total = maxSignals;
  }

  return {
    searchResult: mergedSearchResults,
    searchDuration: result.searchAfterTimes.reduce((a, b) => Number(a) + Number(b), 0).toFixed(2),
    searchErrors: result.errors,
  };
};
