/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import type { RuleUpgradeState } from '../../../../model/prebuilt_rule_upgrade';
import type { NonUpgradeableDiffableFields } from '../../../../model/prebuilt_rule_upgrade/fields';
import { isNonUpgradeableFieldName } from '../../../../model/prebuilt_rule_upgrade/fields';
import { RuleUpgradeInfoBar } from './rule_upgrade_info_bar';
import { RuleUpgradeCallout } from './rule_upgrade_callout';
import { FieldUpgrade } from './field_upgrade';

type FieldDiffEntries<FieldsDiff, ExcludedFields extends keyof FieldsDiff = never> = Array<
  [
    Exclude<keyof FieldsDiff, ExcludedFields>,
    Required<FieldsDiff>[Exclude<keyof FieldsDiff, ExcludedFields>]
  ]
>;

interface RuleUpgradeProps {
  ruleUpgradeState: RuleUpgradeState;
}

export function RuleUpgrade({ ruleUpgradeState }: RuleUpgradeProps): React.ReactNode {
  const fieldDiffEntries = Object.entries(ruleUpgradeState.diff.fields) as FieldDiffEntries<
    typeof ruleUpgradeState.diff.fields
  >;

  const fields = fieldDiffEntries.filter(([fieldName]) => {
    return isNonUpgradeableFieldName(fieldName) === false;
  }) as FieldDiffEntries<typeof ruleUpgradeState.diff.fields, NonUpgradeableDiffableFields>;

  return (
    <>
      <EuiSpacer size="s" />
      <RuleUpgradeInfoBar ruleUpgradeState={ruleUpgradeState} />
      <EuiSpacer size="s" />
      <RuleUpgradeCallout ruleUpgradeState={ruleUpgradeState} />
      <EuiSpacer size="s" />
      {fields.map(([fieldName, fieldDiff]) => (
        <FieldUpgrade
          key={fieldName}
          fieldName={fieldName}
          fieldUpgradeState={ruleUpgradeState.fieldsUpgradeState[fieldName]}
          fieldThreeWayDiff={fieldDiff}
        />
      ))}
    </>
  );
}
