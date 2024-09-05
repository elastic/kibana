/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback } from 'react';
import type { Type } from '@kbn/securitysolution-io-ts-alerting-types';
import { isEqlRule, isSuppressibleAlertRule } from '../../../../common/detection_engine/utils';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';

export interface UseAlertSuppressionReturn {
  isSuppressionEnabled: boolean;
}

export const useAlertSuppression = (
  ruleType: Type | undefined,
  isEqlSequenceQuery = false
): UseAlertSuppressionReturn => {
  const isAlertSuppressionForSequenceEQLRuleEnabled = useIsExperimentalFeatureEnabled(
    'alertSuppressionForSequenceEqlRuleEnabled'
  );

  const isSuppressionEnabledForRuleType = useCallback(() => {
    if (!ruleType) {
      return false;
    }

    if (isEqlRule(ruleType) && isEqlSequenceQuery) {
      console.error('IS SEQUENCE SUPPRESSION ENABLED', isAlertSuppressionForSequenceEQLRuleEnabled);
      return isAlertSuppressionForSequenceEQLRuleEnabled;
    }

    return isSuppressibleAlertRule(ruleType);
  }, [ruleType, isAlertSuppressionForSequenceEQLRuleEnabled, isEqlSequenceQuery]);

  return {
    isSuppressionEnabled: isSuppressionEnabledForRuleType(),
  };
};
