/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

export const ALERT_SUPPRESSION_DURATION_PER_RULE_EXECUTION_OPTION = i18n.translate(
  'xpack.securitySolution.ruleManagement.ruleFields.thresholdAlertSuppression.suppressionDuration.perRuleExecutionOption',
  {
    defaultMessage: 'Per rule execution',
  }
);

export const ALERT_SUPPRESSION_DURATION_PER_TIME_PERIOD_OPTION = i18n.translate(
  'xpack.securitySolution.ruleManagement.ruleFields.thresholdAlertSuppression.suppressionDuration.perTimePeriodOption',
  {
    defaultMessage: 'Per time period',
  }
);

export const enableSuppressionForFields = (fields: string[]) => (
  <FormattedMessage
    id="xpack.securitySolution.ruleManagement.ruleFields.thresholdAlertSuppression.enableForFields"
    defaultMessage="Suppress alerts by selected fields: {fieldsString}"
    values={{ fieldsString: <strong>{fields.join(', ')}</strong> }}
  />
);

export const SUPPRESS_ALERTS = i18n.translate(
  'xpack.securitySolution.ruleManagement.ruleFields.thresholdAlertSuppression.enable',
  {
    defaultMessage: 'Suppress alerts',
  }
);

export const THRESHOLD_SUPPRESSION_PER_RULE_EXECUTION_WARNING = i18n.translate(
  'xpack.securitySolution.ruleManagement.ruleFields.thresholdAlertSuppression.perRuleExecutionWarning',
  {
    defaultMessage: 'Per rule execution option is not available for Threshold rule type',
  }
);
