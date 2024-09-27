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
import { UpgradeInfoBar } from './upgrade_info_bar';
import { RuleDiffSection } from './rule_diff_section';
import type { RuleSignatureId } from '../../../../../../common/api/detection_engine';

interface ThreeWayDiffTabProps {
  ruleId: RuleSignatureId;
  ruleUpgradeState: RuleUpgradeState;
  setFieldResolvedValue: (ruleId: RuleSignatureId) => SetRuleFieldResolvedValueFn;
}

export function ThreeWayDiffTab({
  ruleId,
  ruleUpgradeState,
  setFieldResolvedValue,
}: ThreeWayDiffTabProps): JSX.Element {
  // TODO: Find a better name for this function to avoid confusion with the one that is not ruleId-specific
  const setFieldResolvedValueForRule = setFieldResolvedValue(ruleId);

  return (
    <>
      <EuiSpacer size="s" />
      <UpgradeInfoBar ruleUpgradeState={ruleUpgradeState} />
      <EuiSpacer size="s" />
      <RuleDiffSection
        ruleUpgradeState={ruleUpgradeState}
        setFieldResolvedValue={setFieldResolvedValueForRule}
      />
    </>
  );
}
