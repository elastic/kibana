/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback } from 'react';
import type { Type } from '@kbn/securitysolution-io-ts-alerting-types';
import {
  isEqlRule,
  isNewTermsRule,
  isSuppressibleAlertRule,
} from '../../../../common/detection_engine/utils';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';

export interface UseAlertSuppressionReturn {
  isSuppressionEnabled: boolean;
}

export const useAlertSuppression = (ruleType: Type | undefined): UseAlertSuppressionReturn => {
  const isAlertSuppressionForNonSequenceEQLRuleEnabled = useIsExperimentalFeatureEnabled(
    'alertSuppressionForNonSequenceEqlRuleEnabled'
  );
  const isAlertSuppressionForNewTermsRuleEnabled = useIsExperimentalFeatureEnabled(
    'alertSuppressionForNewTermsRuleEnabled'
  );

  const isSuppressionEnabledForRuleType = useCallback(() => {
    if (!ruleType) {
      return false;
    }

    // Remove this condition when the Feature Flag for enabling Suppression in the New terms rule is removed.
    if (isNewTermsRule(ruleType)) {
      return isSuppressibleAlertRule(ruleType) && isAlertSuppressionForNewTermsRuleEnabled;
    }

    // Remove this condition when the Feature Flag for enabling Suppression in the EQL rule is removed.
    if (isEqlRule(ruleType)) {
      return isSuppressibleAlertRule(ruleType) && isAlertSuppressionForNonSequenceEQLRuleEnabled;
    }

    return isSuppressibleAlertRule(ruleType);
  }, [
    ruleType,
    isAlertSuppressionForNewTermsRuleEnabled,
    isAlertSuppressionForNonSequenceEQLRuleEnabled,
  ]);

  return {
    isSuppressionEnabled: isSuppressionEnabledForRuleType(),
  };
};
