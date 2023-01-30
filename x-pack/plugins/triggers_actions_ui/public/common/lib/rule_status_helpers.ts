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
  const isRuleUsingExecutionStatus = getIsExperimentalFeatureEnabled('ruleUseExecutionStatus');
  if (isRuleUsingExecutionStatus) {
    return getExecutionStatusHealthColor(rule.executionStatus.status);
  }
  return (rule.lastRun && getOutcomeHealthColor(rule.lastRun.outcome)) || 'subdued';
};

export const getIsLicenseError = (rule: Rule) => {
  return (
    rule.lastRun?.warning === RuleExecutionStatusErrorReasons.License ||
    rule.executionStatus.error?.reason === RuleExecutionStatusErrorReasons.License
  );
};

export const getRuleStatusMessage = ({
  rule,
  licenseErrorText,
  lastOutcomeTranslations,
  executionStatusTranslations,
}: {
  rule: Rule;
  licenseErrorText: string;
  lastOutcomeTranslations: Record<string, string>;
  executionStatusTranslations: Record<string, string>;
}) => {
  const isLicenseError = getIsLicenseError(rule);
  const isRuleUsingExecutionStatus = getIsExperimentalFeatureEnabled('ruleUseExecutionStatus');

  if (isLicenseError) {
    return licenseErrorText;
  }
  if (isRuleUsingExecutionStatus) {
    return executionStatusTranslations[rule.executionStatus.status];
  }
  return rule.lastRun && lastOutcomeTranslations[rule.lastRun.outcome];
};
