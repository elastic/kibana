/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import type {
  RuleUpgradeState,
  SetRuleFieldResolvedValueFn,
} from '../../../model/prebuilt_rule_upgrade';
import { RuleUpgradeInfoBar } from './components/rule_upgrade_info_bar';
import { RuleUpgradeConflictsResolver } from './components/rule_upgrade_conflicts_resolver';
import { DiffableRuleContextProvider } from './diffable_rule_context';
import { RuleUpgradeCallout } from './components/rule_upgrade_callout';

interface RuleUpgradeConflictsResolverTabProps {
  ruleUpgradeState: RuleUpgradeState;
  setRuleFieldResolvedValue: SetRuleFieldResolvedValueFn;
}

export function RuleUpgradeConflictsResolverTab({
  ruleUpgradeState,
  setRuleFieldResolvedValue,
}: RuleUpgradeConflictsResolverTabProps): JSX.Element {
  return (
    <DiffableRuleContextProvider
      finalDiffableRule={ruleUpgradeState.finalRule}
      setRuleFieldResolvedValue={setRuleFieldResolvedValue}
    >
      <EuiSpacer size="s" />
      <RuleUpgradeInfoBar ruleUpgradeState={ruleUpgradeState} />
      <EuiSpacer size="s" />
      <RuleUpgradeCallout ruleUpgradeState={ruleUpgradeState} />
      <EuiSpacer size="s" />
      <RuleUpgradeConflictsResolver ruleUpgradeState={ruleUpgradeState} />
    </DiffableRuleContextProvider>
  );
}
