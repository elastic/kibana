/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TIMESTAMP } from '@kbn/rule-data-utils';

import {
  ThresholdNormalized,
  TimestampOverrideOrUndefined,
} from '../../../../../common/detection_engine/schemas/common/schemas';
import {
  AlertInstanceContext,
  AlertInstanceState,
  RuleExecutorServices,
} from '../../../../../../alerting/server';
import { Logger } from '../../../../../../../../src/core/server';
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
    ...(threshold.cardinality?.length
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

  const thresholdFields = threshold.field;

  // order buckets by cardinality (https://github.com/elastic/kibana/issues/95258)
  // const thresholdFieldCount = thresholdFields.length;
  /*
  const orderByCardinality = (i: number = 0) =>
    (thresholdFieldCount === 0 || i === thresholdFieldCount - 1) && threshold.cardinality?.length
      ? { order: { cardinality_count: 'desc' } }
      : {};
  */

  // Generate a nested terms aggregation for each threshold grouping field provided, appending leaf
  // aggregations to 1) filter out buckets that don't meet the cardinality threshold, if provided, and
  // 2) return the latest hit for each bucket so that we can persist the timestamp of the event in the
  // `original_time` of the signal. This will be used for dupe mitigation purposes by the detection
  // engine.

  // TODO: handle when no threshold fields are provided
  const aggregations = {
    thresholdTerms: {
      composite: {
        sources: thresholdFields.map((term, i) => ({
          [term]: {
            terms: {
              field: term,
            },
          },
        })),
        // ...(threshold.cardinality?.length ? { order: { cardinality_count: 'desc' } } : {}),
        size: 10000,
      },
      aggs: leafAggs,
    },
  };

  /*
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
  */

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
  });
};
