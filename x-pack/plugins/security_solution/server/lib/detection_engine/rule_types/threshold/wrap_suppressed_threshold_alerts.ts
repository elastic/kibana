/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import objectHash from 'object-hash';

import type { SuppressionFieldsLatest } from '@kbn/rule-registry-plugin/common/schemas';
import {
  ALERT_SUPPRESSION_DOCS_COUNT,
  ALERT_INSTANCE_ID,
  ALERT_SUPPRESSION_TERMS,
  ALERT_SUPPRESSION_START,
  ALERT_SUPPRESSION_END,
  TIMESTAMP,
} from '@kbn/rule-data-utils';

import type {
  BaseFieldsLatest,
  WrappedFieldsLatest,
} from '../../../../../common/api/detection_engine/model/alerts';
import type { ConfigType } from '../../../../config';
import type { CompleteRule, ThresholdRuleParams } from '../../rule_schema';
import type { IRuleExecutionLogForExecutors } from '../../rule_monitoring';
import { buildBulkBody } from '../factories/utils/build_bulk_body';

import type { ThresholdBucket } from './types';
import type { BuildReasonMessage } from '../utils/reason_formatters';
import { transformBucketIntoHit } from './bulk_create_threshold_signals';
import type { ThresholdNormalized } from '../../../../../common/api/detection_engine/model/rule_schema';

/**
 * wraps suppressed threshold alerts
 * first, transforms aggregation threshold buckets to hits
 * creates instanceId hash, which is used to search suppressed on time interval alerts
 * populates alert's suppression fields
 */
export const wrapSuppressedThresholdALerts = ({
  buckets,
  spaceId,
  completeRule,
  mergeStrategy,
  indicesToQuery,
  buildReasonMessage,
  alertTimestampOverride,
  ruleExecutionLogger,
  publicBaseUrl,
  inputIndex,
  startedAt,
  from,
  to,
  threshold,
}: {
  buckets: ThresholdBucket[];
  spaceId: string;
  completeRule: CompleteRule<ThresholdRuleParams>;
  mergeStrategy: ConfigType['alertMergeStrategy'];
  indicesToQuery: string[];
  buildReasonMessage: BuildReasonMessage;
  alertTimestampOverride: Date | undefined;
  ruleExecutionLogger: IRuleExecutionLogForExecutors;
  publicBaseUrl: string | undefined;
  inputIndex: string;
  startedAt: Date;
  from: Date;
  to: Date;
  suppressionWindow: string;
  threshold: ThresholdNormalized;
}): Array<WrappedFieldsLatest<BaseFieldsLatest & SuppressionFieldsLatest>> => {
  return buckets.map((bucket) => {
    const hit = transformBucketIntoHit(
      bucket,
      inputIndex,
      startedAt,
      from,
      threshold,
      completeRule.ruleParams.ruleId
    );

    const suppressedValues = Object.entries(bucket.key)
      .map(([key, value]) => value)
      .sort((a, b) => a.localeCompare(b));

    const id = objectHash([
      hit._index,
      hit._id,
      `${spaceId}:${completeRule.alertId}`,
      suppressedValues,
    ]);

    const instanceId = objectHash([suppressedValues, completeRule.alertId, spaceId]);

    const baseAlert: BaseFieldsLatest = buildBulkBody(
      spaceId,
      completeRule,
      hit,
      mergeStrategy,
      [],
      true,
      buildReasonMessage,
      indicesToQuery,
      alertTimestampOverride,
      ruleExecutionLogger,
      id,
      publicBaseUrl
    );
    // suppression start/end equals to alert timestamp, since we suppress alerts for threshold rule type, not documents as for query rule type
    const suppressionTime = new Date(baseAlert[TIMESTAMP]);
    return {
      _id: id,
      _index: '',
      _source: {
        ...baseAlert,
        [ALERT_SUPPRESSION_TERMS]: Object.entries(bucket.key).map(([field, value]) => ({
          field,
          value,
        })),
        [ALERT_SUPPRESSION_START]: suppressionTime,
        [ALERT_SUPPRESSION_END]: suppressionTime,
        [ALERT_SUPPRESSION_DOCS_COUNT]: 0,
        [ALERT_INSTANCE_ID]: instanceId,
      },
    };
  });
};
