/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { AnalyticsServiceSetup } from '@kbn/core-analytics-server';
import type { SanitizedRuleConfig } from '@kbn/alerting-plugin/common';
import { ALERT_SUPPRESSION_EVENT } from '../../../../telemetry/event_based/events';
import type { AlertSuppressionDuration } from '../../../../../../common/api/detection_engine/model/rule_schema/common_attributes.gen';
import type { RuleParams } from '../../../rule_schema';

import { isThresholdParams } from '../utils';

export const suppressionDurationToSeconds = (
  duration: AlertSuppressionDuration | undefined
): number => {
  if (!duration) {
    return -1;
  }
  switch (duration.unit) {
    case 's':
      return duration.value;
    case 'm':
      return duration.value * 60;
    case 'h':
      return duration.value * 60 * 60;
    default:
      return -1;
  }
};

interface SendAlertSuppressionEventArgs {
  analytics: AnalyticsServiceSetup;
  suppressedAlertsCount: number;
  createdAlertsCount: number;
  ruleParams: RuleParams;
  ruleAttributes: SanitizedRuleConfig;
}

export const sendAlertSuppressionTelemetryEvent = ({
  analytics,
  suppressedAlertsCount,
  createdAlertsCount,
  ruleParams,
  ruleAttributes,
}: SendAlertSuppressionEventArgs): void => {
  // do not send any telemetry event if suppression is not configured
  if (ruleParams.alertSuppression == null) {
    return;
  }

  // do not send any telemetry if no alerts were suppressed or created
  if (suppressedAlertsCount + createdAlertsCount === 0) {
    return;
  }

  const suppressionGroupByFieldsNumber = isThresholdParams(ruleParams)
    ? ruleParams.threshold?.field?.length || 0
    : ruleParams.alertSuppression.groupBy.length;

  const suppressionGroupByFields = isThresholdParams(ruleParams)
    ? ruleParams.threshold?.field || []
    : ruleParams.alertSuppression.groupBy;

  const suppressionMissingFields = isThresholdParams(ruleParams)
    ? false
    : ruleParams.alertSuppression.missingFieldsStrategy !== 'doNotSuppress';

  const telemetryEvent = {
    suppressionAlertsCreated: createdAlertsCount,
    suppressionAlertsSuppressed: suppressedAlertsCount,
    suppressionRuleName: ruleParams.immutable ? ruleAttributes.name : 'Custom rule',
    suppressionDuration: suppressionDurationToSeconds(ruleParams.alertSuppression.duration),
    suppressionGroupByFieldsNumber,
    suppressionGroupByFields,
    suppressionRuleType: ruleParams.type,
    suppressionMissingFields,
    suppressionRuleId: ruleParams.ruleId,
  };
  analytics.reportEvent(ALERT_SUPPRESSION_EVENT.eventType, telemetryEvent);
};
