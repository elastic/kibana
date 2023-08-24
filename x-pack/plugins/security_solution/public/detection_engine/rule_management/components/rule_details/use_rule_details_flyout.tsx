/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { invariant } from '../../../../../common/utils/invariant';
import type {
  RuleInstallationInfoForReview,
  RuleSignatureId,
} from '../../../../../common/api/detection_engine';
import type { DiffableRule } from '../../../../../common/api/detection_engine/prebuilt_rules/model/diff/diffable_rule/diffable_rule';

export interface RuleDetailsFlyoutState {
  flyoutRule: RuleInstallationInfoForReview | null;
}

export interface RuleDetailsFlyoutActions {
  openFlyoutForRuleId: (ruleId: RuleSignatureId) => void;
  closeFlyout: () => void;
}

export const useRuleDetailsFlyout = (
  rules: DiffableRule[]
): RuleDetailsFlyoutState & RuleDetailsFlyoutActions => {
  const [flyoutRule, setFlyoutRule] = React.useState<RuleInstallationInfoForReview | null>(null);

  const openFlyoutForRuleId = useCallback(
    (ruleId: RuleSignatureId) => {
      const ruleToShowInFlyout = rules.find((rule) => rule.rule_id === ruleId);
      invariant(ruleToShowInFlyout, `Rule with id ${ruleId} not found`);
      if (ruleToShowInFlyout) {
        setFlyoutRule(ruleToShowInFlyout);
      }
    },
    [rules, setFlyoutRule]
  );

  const closeFlyout = useCallback(() => {
    setFlyoutRule(null);
  }, []);

  return {
    openFlyoutForRuleId,
    closeFlyout,
    flyoutRule,
  };
};
