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
import type { SearchHit } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import { buildReasonMessageForThresholdAlert } from '../utils/reason_formatters';
import type { ThresholdBucket } from './types';
import type { RunOpts } from '../types';
import type { CompleteRule, ThresholdRuleParams } from '../../rule_schema';
import type { BaseFieldsLatest } from '../../../../../common/api/detection_engine/model/alerts';
import type { IRuleExecutionLogForExecutors } from '../../rule_monitoring';
import { bulkCreateWithSuppression } from '../utils/bulk_create_with_suppression';
import type { GenericBulkCreateResponse } from '../utils/bulk_create_with_suppression';
import { wrapSuppressedThresholdALerts } from './wrap_suppressed_threshold_alerts';
import { transformBulkCreatedItemsToHits } from './utils';

interface BulkCreateSuppressedThresholdAlertsParams {
  buckets: ThresholdBucket[];
  completeRule: CompleteRule<ThresholdRuleParams>;
  services: RuleExecutorServices<AlertInstanceState, AlertInstanceContext, 'default'>;
  inputIndexPattern: string[];
  startedAt: Date;
  from: Date;
  to: Date;
  ruleExecutionLogger: IRuleExecutionLogForExecutors;
  spaceId: string;
  runOpts: RunOpts<ThresholdRuleParams>;
}

/**
 * wraps threshold alerts and creates them using bulkCreateWithSuppression utility
 * returns {@link GenericBulkCreateResponse}
 * and unsuppressed alerts, needed to create correct threshold history
 */
export const bulkCreateSuppressedThresholdAlerts = async ({
  buckets,
  completeRule,
  services,
  inputIndexPattern,
  startedAt,
  from,
  to,
  ruleExecutionLogger,
  spaceId,
  runOpts,
}: BulkCreateSuppressedThresholdAlertsParams): Promise<{
  bulkCreateResult: GenericBulkCreateResponse<BaseFieldsLatest & SuppressionFieldsLatest>;
  unsuppressedAlerts: Array<SearchHit<unknown>>;
}> => {
  const ruleParams = completeRule.ruleParams;
  const suppressionDuration = runOpts.completeRule.ruleParams.alertSuppression?.duration;
  if (!suppressionDuration) {
    throw Error('Suppression duration can not be empty');
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
    inputIndex: inputIndexPattern.join(','),
    startedAt,
    from,
    to,
    suppressionWindow,
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

  return {
    bulkCreateResult,
    // if there errors we going to use created items only
    unsuppressedAlerts: bulkCreateResult.errors.length
      ? transformBulkCreatedItemsToHits(bulkCreateResult.createdItems)
      : wrappedAlerts,
  };
};
