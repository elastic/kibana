/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  RuleLastRunOutcomes,
  RuleExecutionStatuses,
  RuleExecutionStatusErrorReasons,
} from '@kbn/alerting-plugin/common';
import { getIsExperimentalFeatureEnabled } from '../get_experimental_features';
import { Rule } from '../../types';
import {
  rulesLastRunOutcomeTranslationMapping,
  rulesStatusesTranslationsMapping,
  ALERT_STATUS_LICENSE_ERROR,
} from '../../application/sections/rules_list/translations';

export const getOutcomeHealthColor = (status: RuleLastRunOutcomes) => {
  switch (status) {
    case 'succeeded':
      return 'success';
    case 'failed':
      return 'danger';
    case 'warning':
      return 'warning';
    default:
      return 'subdued';
  }
};

export const getExecutionStatusHealthColor = (status: RuleExecutionStatuses) => {
  switch (status) {
    case 'active':
      return 'success';
    case 'error':
      return 'danger';
    case 'ok':
      return 'primary';
    case 'pending':
      return 'accent';
    case 'warning':
      return 'warning';
    default:
      return 'subdued';
  }
};

export const getRuleHealthColor = (rule: Rule) => {
  const isRuleLastRunOutcomeEnabled = getIsExperimentalFeatureEnabled('ruleLastRunOutcome');
  if (isRuleLastRunOutcomeEnabled) {
    return (rule.lastRun && getOutcomeHealthColor(rule.lastRun.outcome)) || 'subdued';
  }
  return getExecutionStatusHealthColor(rule.executionStatus.status);
};

export const getIsLicenseError = (rule: Rule) => {
  return (
    rule.lastRun?.warning === RuleExecutionStatusErrorReasons.License ||
    rule.executionStatus.error?.reason === RuleExecutionStatusErrorReasons.License
  );
};

export const getRuleStatusMessage = (rule: Rule) => {
  const isLicenseError = getIsLicenseError(rule);
  const isRuleLastRunOutcomeEnabled = getIsExperimentalFeatureEnabled('ruleLastRunOutcome');

  if (isLicenseError) {
    return ALERT_STATUS_LICENSE_ERROR;
  }
  if (isRuleLastRunOutcomeEnabled) {
    return rule.lastRun && rulesLastRunOutcomeTranslationMapping[rule.lastRun.outcome];
  }
  return rulesStatusesTranslationsMapping[rule.executionStatus.status];
};
