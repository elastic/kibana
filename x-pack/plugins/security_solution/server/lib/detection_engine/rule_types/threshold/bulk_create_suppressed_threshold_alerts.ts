/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AlertInstanceContext,
  AlertInstanceState,
  RuleExecutorServices,
} from '@kbn/alerting-plugin/server';
import type { SuppressionFieldsLatest } from '@kbn/rule-registry-plugin/common/schemas';

import type { GenericBulkCreateResponse } from '../factories/bulk_create_factory';
import { buildReasonMessageForThresholdAlert } from '../utils/reason_formatters';
import type { ThresholdBucket } from './types';
import type { RunOpts } from '../types';
import type { CompleteRule, ThresholdRuleParams } from '../../rule_schema';
import type { BaseFieldsLatest } from '../../../../../common/api/detection_engine/model/alerts';
import type { IRuleExecutionLogForExecutors } from '../../rule_monitoring';
import { bulkCreateWithSuppression } from '../query/alert_suppression/bulk_create_with_suppression';
import { wrapSuppressedThresholdALerts } from './wrap_suppressed_threshold_alerts';

interface BulkCreateSuppressedThresholdAlertsParams {
  buckets: ThresholdBucket[];
  completeRule: CompleteRule<ThresholdRuleParams>;
  services: RuleExecutorServices<AlertInstanceState, AlertInstanceContext, 'default'>;
  inputIndexPattern: string[];
  startedAt: Date;
  from: Date;
  ruleExecutionLogger: IRuleExecutionLogForExecutors;
  spaceId: string;
  runOpts: RunOpts<ThresholdRuleParams>;
}

export const bulkCreateSuppressedThresholdAlerts = async ({
  buckets,
  completeRule,
  services,
  inputIndexPattern,
  startedAt,
  from,
  ruleExecutionLogger,
  spaceId,
  runOpts,
}: BulkCreateSuppressedThresholdAlertsParams): Promise<
  GenericBulkCreateResponse<BaseFieldsLatest & SuppressionFieldsLatest>
> => {
  const ruleParams = completeRule.ruleParams;
  const suppressionDuration = runOpts.completeRule.ruleParams.alertSuppression?.duration;
  const groupByFields = runOpts.completeRule.ruleParams.alertSuppression?.groupBy;
  if (!suppressionDuration || !groupByFields) {
    throw Error('Suppression duration or groupByFields can not be empty');
  }

  const suppressionWindow = `now-${suppressionDuration.value}${suppressionDuration.unit}`;

  const wrappedAlerts = wrapSuppressedThresholdALerts({
    buckets,
    spaceId,
    completeRule,
    mergeStrategy: runOpts.mergeStrategy,
    indicesToQuery: runOpts.inputIndex,
    buildReasonMessage: buildReasonMessageForThresholdAlert,
    alertTimestampOverride: runOpts.alertTimestampOverride,
    ruleExecutionLogger,
    publicBaseUrl: runOpts.publicBaseUrl,
    suppressionFields: groupByFields,
    inputIndex: inputIndexPattern.join(','),
    startedAt,
    from,
    threshold: ruleParams.threshold,
  });

  const bulkCreateResult = await bulkCreateWithSuppression({
    alertWithSuppression: runOpts.alertWithSuppression,
    ruleExecutionLogger: runOpts.ruleExecutionLogger,
    wrappedDocs: wrappedAlerts,
    services,
    suppressionWindow,
    alertTimestampOverride: runOpts.alertTimestampOverride,
  });

  return bulkCreateResult;
};
