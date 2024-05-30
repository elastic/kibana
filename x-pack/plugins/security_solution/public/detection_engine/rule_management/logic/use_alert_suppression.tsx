/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback } from 'react';
import type { Type } from '@kbn/securitysolution-io-ts-alerting-types';
import { isMlRule, isSuppressibleAlertRule } from '../../../../common/detection_engine/utils';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';

export interface UseAlertSuppressionReturn {
  isSuppressionEnabled: boolean;
}

export const useAlertSuppression = (ruleType: Type | undefined): UseAlertSuppressionReturn => {
  const isAlertSuppressionForMachineLearningRuleEnabled = useIsExperimentalFeatureEnabled(
    'alertSuppressionForMachineLearningRuleEnabled'
  );
  const isAlertSuppressionForEsqlRuleEnabled = useIsExperimentalFeatureEnabled(
    'alertSuppressionForEsqlRuleEnabled'
  );

  const isSuppressionEnabledForRuleType = useCallback(() => {
    if (!ruleType) {
      return false;
    }
    // Remove this condition when the Feature Flag for enabling Suppression in the New terms rule is removed.
    if (ruleType === 'esql') {
      return isSuppressibleAlertRule(ruleType) && isAlertSuppressionForEsqlRuleEnabled;
    }

    if (isMlRule(ruleType)) {
      return isSuppressibleAlertRule(ruleType) && isAlertSuppressionForMachineLearningRuleEnabled;
    }

    return isSuppressibleAlertRule(ruleType);
  }, [
    isAlertSuppressionForEsqlRuleEnabled,
    isAlertSuppressionForMachineLearningRuleEnabled,
    ruleType,
  ]);

  return {
    isSuppressionEnabled: isSuppressionEnabledForRuleType(),
  };
};
