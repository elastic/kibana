/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiSpacer } from '@elastic/eui';
import type { PartialRuleDiff } from '../../../../../../../common/api/detection_engine';
import {
  NON_UPGRADEABLE_DIFFABLE_FIELDS,
  ThreeWayDiffConflict,
} from '../../../../../../../common/api/detection_engine';
import type {
  RuleUpgradeState,
  SetRuleFieldResolvedValueFn,
} from '../../../../model/prebuilt_rule_upgrade';
import type { UpgradeableDiffableFields } from '../../../../model/prebuilt_rule_upgrade/fields';
import { RuleUpgradeInfoBar } from './rule_upgrade_info_bar';
import { RuleUpgradeCallout } from './rule_upgrade_callout';
import { FieldUpgrade } from './field_upgrade';
import { FieldUpgradeContextProvider } from './field_upgrade_context';

interface RuleUpgradeProps {
  ruleUpgradeState: RuleUpgradeState;
  setRuleFieldResolvedValue: SetRuleFieldResolvedValueFn;
}

export const RuleUpgrade = memo(function RuleUpgrade({
  ruleUpgradeState,
  setRuleFieldResolvedValue,
}: RuleUpgradeProps): JSX.Element {
  const cleanedRuleUpgradeState = {
    ...ruleUpgradeState,
    diff: cleanupNonCustomizableFieldDiffs(ruleUpgradeState.diff),
  };
  const fieldNames = Object.keys(
    cleanedRuleUpgradeState.diff.fields
  ) as UpgradeableDiffableFields[];

  return (
    <>
      <EuiSpacer size="s" />
      <RuleUpgradeInfoBar ruleUpgradeState={cleanedRuleUpgradeState} />
      <EuiSpacer size="s" />
      <RuleUpgradeCallout ruleUpgradeState={cleanedRuleUpgradeState} />
      <EuiSpacer size="s" />
      {fieldNames.map((fieldName) => (
        <FieldUpgradeContextProvider
          key={fieldName}
          ruleUpgradeState={cleanedRuleUpgradeState}
          fieldName={fieldName}
          setRuleFieldResolvedValue={setRuleFieldResolvedValue}
        >
          <FieldUpgrade />
        </FieldUpgradeContextProvider>
      ))}
    </>
  );
});

/**
 * Cleans up non customizable field diffs
 */
function cleanupNonCustomizableFieldDiffs(diff: PartialRuleDiff): PartialRuleDiff {
  const result = {
    ...diff,
    fields: {
      ...diff.fields,
    },
  };

  for (const nonCustomizableFieldName of NON_UPGRADEABLE_DIFFABLE_FIELDS) {
    const nonCustomizableFieldDiff = result.fields[nonCustomizableFieldName];

    if (nonCustomizableFieldDiff?.conflict === ThreeWayDiffConflict.NONE) {
      result.num_fields_with_updates--;
    }

    if (nonCustomizableFieldDiff?.conflict === ThreeWayDiffConflict.SOLVABLE) {
      result.num_fields_with_conflicts--;
    }

    if (nonCustomizableFieldDiff?.conflict === ThreeWayDiffConflict.NON_SOLVABLE) {
      result.num_fields_with_non_solvable_conflicts--;
      result.num_fields_with_conflicts--;
    }

    delete result.fields[nonCustomizableFieldName];
  }

  return result;
}
