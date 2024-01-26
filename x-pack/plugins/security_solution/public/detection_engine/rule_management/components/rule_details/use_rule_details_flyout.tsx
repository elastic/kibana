/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { invariant } from '../../../../../common/utils/invariant';
import type { RuleObjectId } from '../../../../../common/api/detection_engine';
import type { RuleResponse } from '../../../../../common/api/detection_engine/model/rule_schema';

export interface RuleDetailsFlyoutState {
  previewedRule: RuleResponse | null;
}

export interface RuleDetailsFlyoutActions {
  openRulePreview: (ruleId: RuleObjectId) => void;
  closeRulePreview: () => void;
}

export const useRuleDetailsFlyout = (
  rules: RuleResponse[]
): RuleDetailsFlyoutState & RuleDetailsFlyoutActions => {
  const [previewedRule, setRuleForPreview] = React.useState<RuleResponse | null>(null);

  const openRulePreview = useCallback(
    (ruleId: RuleObjectId) => {
      const ruleToShowInFlyout = rules.find((rule) => {
        return rule.id === ruleId;
      });
      invariant(ruleToShowInFlyout, `Rule with id ${ruleId} not found`);
      setRuleForPreview(ruleToShowInFlyout);
    },
    [rules, setRuleForPreview]
  );

  const closeRulePreview = useCallback(() => {
    setRuleForPreview(null);
  }, []);

  return {
    openRulePreview,
    closeRulePreview,
    previewedRule,
  };
};
