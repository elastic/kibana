/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback } from 'react';
import { Type } from '@kbn/securitysolution-io-ts-alerting-types';
import { isSuppressibleAlertRule } from '../../../../common/detection_engine/utils';
import { SuppressibleAlertRules } from '../../../../common/detection_engine/constants';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';
export interface UseAlertSuppressionReturn {
  isSuppressionEnabled: boolean;
}

export const useAlertSuppression = (ruleType?: Type): UseAlertSuppressionReturn => {
  const isThreatMatchRuleFFEnabled = useIsExperimentalFeatureEnabled(
    'alertSuppressionForIndicatorMatchRuleEnabled'
  );

  const isSuppressionEnabledForRuleType = useCallback(() => {
    if (!ruleType) return false;

    if (ruleType === SuppressibleAlertRules.THREAT_MATCH) return isThreatMatchRuleFFEnabled;

    return isSuppressibleAlertRule(ruleType);
  }, [ruleType, isThreatMatchRuleFFEnabled]);

  return {
    isSuppressionEnabled: isSuppressionEnabledForRuleType(),
  };
};
