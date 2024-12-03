/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiSpacer } from '@elastic/eui';
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
  const fieldNames = Object.keys(
    ruleUpgradeState.fieldsUpgradeState
  ) as UpgradeableDiffableFields[];

  return (
    <>
      <EuiSpacer size="s" />
      <RuleUpgradeInfoBar ruleUpgradeState={ruleUpgradeState} />
      <EuiSpacer size="s" />
      <RuleUpgradeCallout ruleUpgradeState={ruleUpgradeState} />
      <EuiSpacer size="s" />
      {fieldNames.map((fieldName) => (
        <FieldUpgradeContextProvider
          key={fieldName}
          ruleUpgradeState={ruleUpgradeState}
          fieldName={fieldName}
          setRuleFieldResolvedValue={setRuleFieldResolvedValue}
        >
          <FieldUpgrade />
        </FieldUpgradeContextProvider>
      ))}
    </>
  );
});
