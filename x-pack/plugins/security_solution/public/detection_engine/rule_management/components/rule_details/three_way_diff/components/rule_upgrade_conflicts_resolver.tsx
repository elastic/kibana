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
} from '../../../../../rule_management_ui/components/rules_table/upgrade_prebuilt_rules_table/use_prebuilt_rules_upgrade_state';
import { FieldUpgradeConflictsResolver } from './field_upgrade_conflicts_resolver';

interface RuleUpgradeConflictsResolverProps {
  ruleUpgradeState: RuleUpgradeState;
  setRuleFieldResolvedValue: SetRuleFieldResolvedValueFn;
}

export function RuleUpgradeConflictsResolver({
  ruleUpgradeState,
  setRuleFieldResolvedValue,
}: RuleUpgradeConflictsResolverProps): JSX.Element {
  const fieldDiffEntries = Object.entries(ruleUpgradeState.diff.fields) as Array<
    [
      keyof typeof ruleUpgradeState.diff.fields,
      Required<typeof ruleUpgradeState.diff.fields>[keyof typeof ruleUpgradeState.diff.fields]
    ]
  >;
  const fields = fieldDiffEntries.map(([fieldName, fieldDiff]) => (
    <FieldUpgradeConflictsResolver
      key={fieldName}
      fieldName={fieldName}
      fieldThreeWayDiff={fieldDiff}
      finalDiffableRule={ruleUpgradeState.finalRule}
    />
  ));

  return <>{fields}</>;
}
