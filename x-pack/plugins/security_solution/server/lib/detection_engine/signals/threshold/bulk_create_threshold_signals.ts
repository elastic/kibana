/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TIMESTAMP } from '@kbn/rule-data-utils';

import type {
  AlertInstanceContext,
  AlertInstanceState,
  RuleExecutorServices,
} from '@kbn/alerting-plugin/server';
import type { ThresholdNormalized } from '../../../../../common/detection_engine/schemas/common/schemas';
import type { GenericBulkCreateResponse } from '../../rule_types/factories/bulk_create_factory';
import { calculateThresholdSignalUuid } from '../utils';
import { buildReasonMessageForThresholdAlert } from '../reason_formatters';
import type { ThresholdSignalHistory, BulkCreate, WrapHits } from '../types';
import type { CompleteRule, ThresholdRuleParams } from '../../rule_schema';
import type { BaseFieldsLatest } from '../../../../../common/detection_engine/schemas/alerts';
import type { ThresholdBucket } from './types';
import { createEnrichEventsFunction } from '../enrichments';
import type { IRuleExecutionLogForExecutors } from '../../rule_monitoring';

interface BulkCreateThresholdSignalsParams {
  buckets: ThresholdBucket[];
  completeRule: CompleteRule<ThresholdRuleParams>;
  services: RuleExecutorServices<AlertInstanceState, AlertInstanceContext, 'default'>;
  inputIndexPattern: string[];
  filter: unknown;
  signalsIndex: string;
  startedAt: Date;
  from: Date;
  signalHistory: ThresholdSignalHistory;
  bulkCreate: BulkCreate;
  wrapHits: WrapHits;
  ruleExecutionLogger: IRuleExecutionLogForExecutors;
}

export const getTransformedHits = (
  buckets: ThresholdBucket[],
  inputIndex: string,
  startedAt: Date,
  from: Date,
  threshold: ThresholdNormalized,
  ruleId: string
) =>
  buckets.map((bucket, i) => {
    // In case of absent threshold fields, `bucket.key` will be an empty string. Note that `Object.values('')` is `[]`,
    // so the below logic works in either case (whether `terms` or `composite`).
    return {
      _index: inputIndex,
      _id: calculateThresholdSignalUuid(
        ruleId,
        startedAt,
        threshold.field,
        Object.values(bucket.key).sort().join(',')
      ),
      _source: {
        [TIMESTAMP]: bucket.max_timestamp.value_as_string,
        ...bucket.key,
        threshold_result: {
          cardinality: threshold.cardinality?.length
            ? [
                {
                  field: threshold.cardinality[0].field,
                  value: bucket.cardinality_count?.value,
                },
              ]
            : undefined,
          count: bucket.doc_count,
          from: bucket.min_timestamp.value_as_string
            ? new Date(bucket.min_timestamp.value_as_string)
            : from,
          terms: Object.entries(bucket.key).map(([key, val]) => ({ field: key, value: val })),
        },
      },
    };
  });

export const bulkCreateThresholdSignals = async (
  params: BulkCreateThresholdSignalsParams
): Promise<GenericBulkCreateResponse<BaseFieldsLatest>> => {
  const ruleParams = params.completeRule.ruleParams;
  const ecsResults = getTransformedHits(
    params.buckets,
    params.inputIndexPattern.join(','),
    params.startedAt,
    params.from,
    ruleParams.threshold,
    ruleParams.ruleId
  );

  return params.bulkCreate(
    params.wrapHits(ecsResults, buildReasonMessageForThresholdAlert),
    undefined,
    createEnrichEventsFunction({
      services: params.services,
      logger: params.ruleExecutionLogger,
    })
  );
};
