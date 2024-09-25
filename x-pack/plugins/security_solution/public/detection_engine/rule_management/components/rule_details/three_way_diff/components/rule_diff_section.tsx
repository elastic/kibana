/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type {
  DiffableAllFields,
  ThreeWayDiff,
} from '../../../../../../../common/api/detection_engine';
import type { RuleUpgradeState } from '../../../../../rule_management_ui/components/rules_table/upgrade_prebuilt_rules_table/use_prebuilt_rules_upgrade_state';
import { RuleDiffField } from './rule_diff_field';

interface RuleDiffSectionProps {
  ruleUpgradeState: RuleUpgradeState;
}

export function RuleDiffSection({ ruleUpgradeState }: RuleDiffSectionProps): JSX.Element {
  const fieldNames = Object.keys(ruleUpgradeState.diff.fields) as Array<
    keyof typeof ruleUpgradeState.diff.fields
  >;
  const fields = fieldNames.map((fieldName) => (
    <RuleDiffField
      key={fieldName}
      fieldName={fieldName}
      fieldThreeWayDiff={
        ruleUpgradeState.diff.fields[fieldName] as ThreeWayDiff<DiffableAllFields[typeof fieldName]>
      }
      finalDiffableRule={ruleUpgradeState.finalRule}
      resolvedValue={ruleUpgradeState.finalRule[fieldName]}
    />
  ));

  return <>{fields}</>;
}
