/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type {
  RuleUpgradeState,
  SetRuleFieldResolvedValueFn,
} from '../../../model/prebuilt_rule_upgrade';
import { RuleUpgrade } from './rule_upgrade';
import { FinalRuleContextProvider } from './final_rule_context';

interface RuleUpgradeTabProps {
  ruleUpgradeState: RuleUpgradeState;
  setRuleFieldResolvedValue: SetRuleFieldResolvedValueFn;
}

export function RuleUpgradeTab({
  ruleUpgradeState,
  setRuleFieldResolvedValue,
}: RuleUpgradeTabProps): JSX.Element {
  return (
    <FinalRuleContextProvider
      finalDiffableRule={ruleUpgradeState.finalRule}
      setRuleFieldResolvedValue={setRuleFieldResolvedValue}
    >
      <RuleUpgrade ruleUpgradeState={ruleUpgradeState} />
    </FinalRuleContextProvider>
  );
}
