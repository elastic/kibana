/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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

interface FindThresholdSignalsParams {
  from: string;
  to: string;
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

export const findThresholdSignals = async ({
  from,
  to,
  inputIndexPattern,
  services,
  logger,
  filter,
  threshold,
  buildRuleMessage,
  timestampOverride,
}: FindThresholdSignalsParams): Promise<{
  searchResult: SignalSearchResponse;
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
              script: `params.cardinalityCount >= ${threshold.cardinality[0].value}`, // TODO: cardinality operator
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

  // Generate a composite aggregation considering each threshold grouping field provided, appending leaf
  // aggregations to 1) filter out buckets that don't meet the cardinality threshold, if provided, and
  // 2) return the first and last hit for each bucket in order to eliminate dupes and reconstruct an accurate
  // timeline.
  const aggregations = {
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
          },
          aggs: leafAggs,
        },
  };

  // TODO: loop as long as we have sort ids
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
    // trackTotalHits: !hasThresholdFields(threshold),
    buildRuleMessage,
  });
};
