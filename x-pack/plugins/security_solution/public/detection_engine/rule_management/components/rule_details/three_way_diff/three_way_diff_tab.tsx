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
  SetFieldResolvedValueFn,
} from '../../../../rule_management_ui/components/rules_table/upgrade_prebuilt_rules_table/use_prebuilt_rules_upgrade_state';
import { UpgradeInfoBar } from './components/upgrade_info_bar';
import { RuleDiffSection } from './components/rule_diff_section';

interface ThreeWayDiffTabProps {
  ruleUpgradeState: RuleUpgradeState;
  setFieldResolvedValue: SetFieldResolvedValueFn;
}

export function ThreeWayDiffTab({
  ruleUpgradeState,
  setFieldResolvedValue,
}: ThreeWayDiffTabProps): JSX.Element {
  return (
    <>
      <EuiSpacer size="s" />
      <UpgradeInfoBar ruleUpgradeState={ruleUpgradeState} />
      <EuiSpacer size="s" />
      <RuleDiffSection ruleUpgradeState={ruleUpgradeState} />
    </>
  );
}
