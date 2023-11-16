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
  suppressionFields,
  inputIndex,
  startedAt,
  from,
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
  suppressionFields: string[];
  inputIndex: string;
  startedAt: Date;
  from: Date;
  threshold: ThresholdNormalized;
}): Array<WrappedFieldsLatest<BaseFieldsLatest & SuppressionFieldsLatest>> => {
  const bucketsMap = buckets.reduce<
    Record<string, WrappedFieldsLatest<BaseFieldsLatest & SuppressionFieldsLatest>>
  >((acc, bucket) => {
    const hit = transformBucketIntoHit(
      bucket,
      inputIndex,
      startedAt,
      from,
      threshold,
      completeRule.ruleParams.ruleId
    );

    // filter out
    const suppressedValues = Object.entries(bucket.key)
      .filter(([key, value]) => suppressionFields.includes(key))
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

    if (acc[instanceId]) {
      acc[instanceId]._source[ALERT_SUPPRESSION_DOCS_COUNT] += 1;
    } else {
      acc[instanceId] = {
        _id: id,
        _index: '',
        _source: {
          ...baseAlert,
          [ALERT_SUPPRESSION_TERMS]: [],
          [ALERT_SUPPRESSION_START]: bucket.min_timestamp.value
            ? new Date(bucket.min_timestamp.value)
            : new Date(),
          [ALERT_SUPPRESSION_END]: bucket.max_timestamp.value
            ? new Date(bucket.max_timestamp.value)
            : new Date(),
          [ALERT_SUPPRESSION_DOCS_COUNT]: 0,
          [ALERT_INSTANCE_ID]: instanceId,
        },
      };
    }

    return acc;
  }, {});

  return Object.values(bucketsMap).slice(0, 100);
};
