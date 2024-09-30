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
} from '../../../../rule_management_ui/components/rules_table/upgrade_prebuilt_rules_table/use_prebuilt_rules_upgrade_state';
import { RuleUpgradeInfoBar } from './components/rule_upgrade_info_bar';
import { RuleUpgradeConflictsResolver } from './components/rule_upgrade_conflicts_resolver';
import type { RuleSignatureId } from '../../../../../../common/api/detection_engine';

interface RuleUpgradeConflictsResolverTabProps {
  ruleId: RuleSignatureId;
  ruleUpgradeState: RuleUpgradeState;
  setRuleFieldResolvedValue: (ruleId: RuleSignatureId) => SetRuleFieldResolvedValueFn;
}

export function RuleUpgradeConflictsResolverTab({
  ruleId,
  ruleUpgradeState,
  setRuleFieldResolvedValue,
}: RuleUpgradeConflictsResolverTabProps): JSX.Element {
  // TODO: Find a better name for this function to avoid confusion with the one that is not ruleId-specific
  const setFieldResolvedValueForRule = setRuleFieldResolvedValue(ruleId);

  return (
    <>
      <EuiSpacer size="s" />
      <RuleUpgradeInfoBar ruleUpgradeState={ruleUpgradeState} />
      <EuiSpacer size="s" />
      <RuleUpgradeConflictsResolver
        ruleUpgradeState={ruleUpgradeState}
        setRuleFieldResolvedValue={setFieldResolvedValueForRule}
      />
    </>
  );
}
