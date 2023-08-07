/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useContext } from 'react';
import { invariant } from '../../../../../../common/utils/invariant';
import type {
  RuleInstallationInfoForReview,
  RuleSignatureId,
} from '../../../../../../common/api/detection_engine';
import { useAddPrebuiltRulesTableContext } from './add_prebuilt_rules_table_context';
import { useUpgradePrebuiltRulesTableContext } from '../upgrade_prebuilt_rules_table/upgrade_prebuilt_rules_table_context';
import type { DiffableRule } from '../../../../../../common/api/detection_engine/prebuilt_rules/model/diff/diffable_rule/diffable_rule';

export interface RuleDetailsFlyoutState {
  flyoutRule: RuleInstallationInfoForReview | null;
}

export interface RuleDetailsFlyoutActions {
  openFlyoutForRuleId: (ruleId: RuleSignatureId) => void;
  closeFlyout: () => void;
}

interface RuleDetailsFlyoutContextType {
  state: RuleDetailsFlyoutState;
  actions: RuleDetailsFlyoutActions;
}

export const RuleDetailsFlyoutContext = React.createContext<RuleDetailsFlyoutContextType | null>(
  null
);

export const AddPrebuiltRulesFlyoutContextProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const {
    state: { rules },
  } = useAddPrebuiltRulesTableContext();

  const { openFlyoutForRuleId, closeFlyout, flyoutRule } = useRuleDetailsFlyout(rules);

  const state: RuleDetailsFlyoutState = {
    flyoutRule,
  };

  const actions: RuleDetailsFlyoutActions = {
    openFlyoutForRuleId,
    closeFlyout,
  };

  return (
    <RuleDetailsFlyoutContext.Provider value={{ state, actions }}>
      {children}
    </RuleDetailsFlyoutContext.Provider>
  );
};

export const UpgradePrebuiltRulesFlyoutContextProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const {
    state: { rules },
  } = useUpgradePrebuiltRulesTableContext();

  const { openFlyoutForRuleId, closeFlyout, flyoutRule } = useRuleDetailsFlyout(
    rules.map(({ rule }) => rule)
  );

  const state: RuleDetailsFlyoutState = {
    flyoutRule,
  };

  const actions: RuleDetailsFlyoutActions = {
    openFlyoutForRuleId,
    closeFlyout,
  };

  return (
    <RuleDetailsFlyoutContext.Provider value={{ state, actions }}>
      {children}
    </RuleDetailsFlyoutContext.Provider>
  );
};

export const RuleDetailsFlyoutContextProvider = ({ children, rules }) => {
  const { openFlyoutForRuleId, closeFlyout, flyoutRule } = useRuleDetailsFlyout(rules);

  const state: RuleDetailsFlyoutState = {
    flyoutRule,
  };

  const actions: RuleDetailsFlyoutActions = {
    openFlyoutForRuleId,
    closeFlyout,
  };

  return (
    <RuleDetailsFlyoutContext.Provider value={{ state, actions }}>
      {children}
    </RuleDetailsFlyoutContext.Provider>
  );
};

export const useRuleDetailsFlyoutContext = (): RuleDetailsFlyoutContextType => {
  const ruleDetailsFlyoutContext = useContext(RuleDetailsFlyoutContext);
  invariant(
    ruleDetailsFlyoutContext,
    'useRuleDetailsFlyoutContext should be used inside RuleDetailsFlyoutContext'
  );

  return ruleDetailsFlyoutContext;
};

export const useRuleDetailsFlyout = (
  rules: DiffableRule[]
): RuleDetailsFlyoutState & RuleDetailsFlyoutActions => {
  const [flyoutRule, setFlyoutRule] = React.useState<RuleInstallationInfoForReview | null>(null);

  const openFlyoutForRuleId = useCallback(
    (ruleId: RuleSignatureId) => {
      const ruleToShowInFlyout = rules.find((rule) => rule.rule_id === ruleId);
      // invariant(rule, `Rule with id ${ruleId} not found`);
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
