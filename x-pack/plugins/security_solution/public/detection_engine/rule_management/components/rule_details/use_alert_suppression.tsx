/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback } from 'react';
import { isSuppressibleAlertRule } from '../../../../../common/detection_engine/utils';
import { SuppressibleAlertRules } from '../../../../../common/detection_engine/constants';
import type { ExperimentalFeatures } from '../../../../../common';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import type { RuleResponse } from '../../../../../common/api/detection_engine/model/rule_schema';

export interface UseAlertSuppressionReturn {
  isSuppressionEnabled: boolean;
}

export const useAlertSuppression = (rule: Partial<RuleResponse>): UseAlertSuppressionReturn => {
  const IsRuleFeatureFlagEnabled = (ruleFFName: keyof ExperimentalFeatures) =>
    useIsExperimentalFeatureEnabled(ruleFFName);

  const isSuppressionEnabledForRuleType = useCallback(() => {
    if (!rule.type) return false;

    if (rule.type === SuppressibleAlertRules.THREAT_MATCH)
      return IsRuleFeatureFlagEnabled('alertSuppressionForIndicatorMatchRuleEnabled');

    return isSuppressibleAlertRule(rule.type);
  }, [rule.type]);

  return {
    isSuppressionEnabled: isSuppressionEnabledForRuleType(),
  };
};
