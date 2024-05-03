/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleSearchResult } from '../../../types';

export const getSuppressionUsage = (
  ruleAttributes: RuleSearchResult
): {
  hasAlertSuppressionPerExecution: boolean;
  hasAlertSuppressionPerPeriod: boolean;
  hasAlertSuppressionMissingFieldsStrategySuppress: boolean;
} => {
  switch (ruleAttributes.params.type) {
    case 'threshold':
      return {
        hasAlertSuppressionPerExecution: false,
        hasAlertSuppressionPerPeriod: ruleAttributes.params.alertSuppression != null,
        hasAlertSuppressionMissingFieldsStrategySuppress: false,
      };
    case 'query':
    case 'saved_query':
    case 'new_terms':
    case 'threat_match':
    case 'eql':
      return {
        hasAlertSuppressionPerExecution:
          ruleAttributes.params.alertSuppression != null &&
          ruleAttributes.params.alertSuppression.duration == null,
        hasAlertSuppressionPerPeriod:
          ruleAttributes.params.alertSuppression != null &&
          ruleAttributes.params.alertSuppression.duration != null,
        hasAlertSuppressionMissingFieldsStrategySuppress:
          ruleAttributes.params.alertSuppression != null &&
          ruleAttributes.params.alertSuppression.missingFieldsStrategy != null &&
          ruleAttributes.params.alertSuppression.missingFieldsStrategy === 'suppress',
      };
    default:
      return {
        hasAlertSuppressionPerExecution: false,
        hasAlertSuppressionPerPeriod: false,
        hasAlertSuppressionMissingFieldsStrategySuppress: false,
      };
  }
};
