/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback } from 'react';
import type { Type } from '@kbn/securitysolution-io-ts-alerting-types';
import { isSuppressibleAlertRule } from '../../../../common/detection_engine/utils';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';
export interface UseAlertSuppressionReturn {
  isSuppressionEnabled: boolean;
}

export const useAlertSuppression = (ruleType: Type | undefined): UseAlertSuppressionReturn => {
  const isThreatMatchRuleFFEnabled = useIsExperimentalFeatureEnabled(
    'alertSuppressionForIndicatorMatchRuleEnabled'
  );

  const isSuppressionEnabledForRuleType = useCallback(() => {
    if (!ruleType) return false;

    // Remove this condition when the Feature Flag for enabling Suppression in the Indicator Match rule is removed.
    if (ruleType === 'threat_match')
      return isSuppressibleAlertRule(ruleType) && isThreatMatchRuleFFEnabled;

    return isSuppressibleAlertRule(ruleType);
  }, [ruleType, isThreatMatchRuleFFEnabled]);

  return {
    isSuppressionEnabled: isSuppressionEnabledForRuleType(),
  };
};
