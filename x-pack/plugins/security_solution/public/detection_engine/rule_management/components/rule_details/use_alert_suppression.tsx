/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback } from 'react';
import { SuppressibleAlertRules } from '../../../../../common/detection_engine/constants';
import type { ExperimentalFeatures } from '../../../../../common';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import type {
  AlertSuppressionGroupBy,
  RuleResponse,
  AlertSuppressionDuration,
  AlertSuppressionMissingFieldsStrategy,
} from '../../../../../common/api/detection_engine/model/rule_schema';

const alertSuppressionField = 'alert_suppression';
const groupByField = 'group_by';
const missingFieldsStrategy = 'missing_fields_strategy';

export interface UseAlertSuppressionReturn {
  isSuppressionEnabled: boolean;
  showGroupBy: boolean;
  duration?: AlertSuppressionDuration;
  groupByFields?: AlertSuppressionGroupBy;
  showMissingFieldsStrategy: boolean;
  missingFieldsStrategy?: AlertSuppressionMissingFieldsStrategy;
}
const defaultReturn: UseAlertSuppressionReturn = {
  isSuppressionEnabled: false,
  showGroupBy: false,
  showMissingFieldsStrategy: false,
};
export const useAlertSuppression = (rule: Partial<RuleResponse>): UseAlertSuppressionReturn => {
  const IsRuleFeatureFlagEnabled = (ruleFFName: keyof ExperimentalFeatures) =>
    useIsExperimentalFeatureEnabled(ruleFFName);

  const isSuppressionEnabledForRuleType = useCallback(() => {
    if (!rule.type) return false;

    if (rule.type === SuppressibleAlertRules.THREAT_MATCH)
      return IsRuleFeatureFlagEnabled('alertSuppressionForIndicatorMatchRuleEnabled');

    return rule.type in SuppressibleAlertRules;
  }, [rule.type]);

  if (alertSuppressionField in rule && rule.alert_suppression) {
    defaultReturn.isSuppressionEnabled = isSuppressionEnabledForRuleType();
    defaultReturn.duration = rule.alert_suppression.duration;

    if (groupByField in rule.alert_suppression) {
      defaultReturn.showGroupBy = true;
      defaultReturn.groupByFields = rule.alert_suppression.group_by;
    }

    if (missingFieldsStrategy in rule.alert_suppression) {
      defaultReturn.showMissingFieldsStrategy = true;

      defaultReturn.missingFieldsStrategy = rule.alert_suppression.missing_fields_strategy;
    }
  }
  return defaultReturn;
};
