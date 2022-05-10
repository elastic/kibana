/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isPlainObject } from 'lodash';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import {
  AggregationsCardinalityAggregate,
  AggregationsCompositeBucket,
  AggregationsMaxAggregate,
  AggregationsMinAggregate,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { TIMESTAMP } from '@kbn/rule-data-utils';

import { Logger } from '@kbn/core/server';
import {
  AlertInstanceContext,
  AlertInstanceState,
  RuleExecutorServices,
} from '@kbn/alerting-plugin/server';
import { ThresholdNormalized } from '../../../../../common/detection_engine/schemas/common/schemas';
import { GenericBulkCreateResponse } from '../../rule_types/factories/bulk_create_factory';
import { calculateThresholdSignalUuid } from '../utils';
import { buildReasonMessageForThresholdAlert } from '../reason_formatters';
import type { ThresholdSignalHistory, BulkCreate, WrapHits, SignalSource } from '../types';
import { CompleteRule, ThresholdRuleParams } from '../../schemas/rule_schemas';
import { BaseFieldsLatest } from '../../../../../common/detection_engine/schemas/alerts';
import { ThresholdBucket } from './types';

interface BulkCreateThresholdSignalsParams {
  buckets: ThresholdBucket[];
  completeRule: CompleteRule<ThresholdRuleParams>;
  services: RuleExecutorServices<AlertInstanceState, AlertInstanceContext, 'default'>;
  inputIndexPattern: string[];
  logger: Logger;
  filter: unknown;
  signalsIndex: string;
  startedAt: Date;
  from: Date;
  signalHistory: ThresholdSignalHistory;
  bulkCreate: BulkCreate;
  wrapHits: WrapHits;
}

const getTransformedHits = (
  buckets: ThresholdBucket[],
  inputIndex: string,
  startedAt: Date,
  from: Date,
  threshold: ThresholdNormalized,
  ruleId: string
) => {
  const isCompositeBucket = (bucket: ThresholdBucket): bucket is AggregationsCompositeBucket =>
    isPlainObject(bucket.key);

  return buckets.map((bucket, i) => ({
    // In case of `terms` aggregation, `bucket.key` will be an empty string. Note that `Object.keys('')` is `[]`,
    // so the below logic works in either case (whether `terms` or `composite`).
    _index: inputIndex,
    _id: calculateThresholdSignalUuid(
      ruleId,
      startedAt,
      threshold.field,
      Object.keys(bucket.key).sort().join(',')
    ),
    _source: {
      [TIMESTAMP]: (bucket.max_timestamp as AggregationsMaxAggregate).value_as_string,
      ...(isCompositeBucket(bucket)
        ? Object.keys(bucket.key).reduce(
            (acc, val) => ({
              ...acc,
              [val]: bucket.key[val],
            }),
            {}
          )
        : {}),
      threshold_result: {
        terms: isCompositeBucket(bucket)
          ? Object.keys(bucket.key).map((term, j) => ({
              field: term,
              value: bucket.key[term],
            }))
          : [],
        cardinality: {
          field: threshold.cardinality ? threshold.cardinality[0]?.field : undefined,
          value: (bucket.cardinality_count as AggregationsCardinalityAggregate)?.value,
        },
        count: bucket.doc_count,
        from:
          new Date((bucket.min_timestamp as AggregationsMinAggregate).value_as_string as string) ??
          from,
      },
    },
  }));
};

export const transformThresholdResultsToEcs = (
  buckets: ThresholdBucket[],
  inputIndex: string,
  startedAt: Date,
  from: Date,
  threshold: ThresholdNormalized,
  ruleId: string
): Array<estypes.SearchHit<SignalSource>> => {
  const transformedHits = getTransformedHits(
    buckets,
    inputIndex,
    startedAt,
    from,
    threshold,
    ruleId
  );

  return transformedHits;
};

export const bulkCreateThresholdSignals = async (
  params: BulkCreateThresholdSignalsParams
): Promise<GenericBulkCreateResponse<BaseFieldsLatest>> => {
  const ruleParams = params.completeRule.ruleParams;
  const ecsResults = transformThresholdResultsToEcs(
    params.buckets,
    params.inputIndexPattern.join(','),
    params.startedAt,
    params.from,
    ruleParams.threshold,
    ruleParams.ruleId
  );

  return params.bulkCreate(params.wrapHits(ecsResults, buildReasonMessageForThresholdAlert));
};
