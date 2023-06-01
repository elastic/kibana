/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiButton } from '@elastic/eui';
import * as i18n from './translations';
import { useUpgradePrebuiltRulesTableContext } from './upgrade_prebuilt_rules_table_context';

export const UpgradePrebuiltRulesTableButtons = () => {
  const {
    state: { rules, selectedRules, isUpgradeSpecificRulesLoading, isUpgradeAllRulesLoading },
    actions: { upgradeAllRules, upgradeSpecificRules },
  } = useUpgradePrebuiltRulesTableContext();

  const upgradeRules = useCallback(async () => {
    await upgradeAllRules();
  }, [upgradeAllRules]);

  const upgradeSelectedRules = useCallback(async () => {
    const updateRulesPayload = selectedRules.map(({ rule, rule_id: ruleId, diff, revision }) => ({
      rule_id: ruleId,
      version: diff.fields.version?.target_version ?? rule.version,
      revision,
    }));
    await upgradeSpecificRules(updateRulesPayload);
  }, [upgradeSpecificRules, selectedRules]);

  const isRulesAvailableForUpgrade = rules.length > 0;
  const numberOfSelectedRules = selectedRules.length ?? 0;
  const shouldDisplayUpgradeSelectedRulesButton = numberOfSelectedRules > 0;

  const isRuleUpgrading = isUpgradeSpecificRulesLoading || isUpgradeAllRulesLoading;

  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap={true}>
      {shouldDisplayUpgradeSelectedRulesButton ? (
        <EuiFlexItem grow={false}>
          <EuiButton
            onClick={upgradeSelectedRules}
            disabled={isUpgradeSpecificRulesLoading || isRuleUpgrading}
          >
            {i18n.UPGRADE_SELECTED_RULES(numberOfSelectedRules)}
          </EuiButton>
        </EuiFlexItem>
      ) : null}
      <EuiFlexItem grow={false}>
        <EuiButton
          fill
          iconType="plusInCircle"
          onClick={upgradeRules}
          disabled={!isRulesAvailableForUpgrade || isRuleUpgrading}
        >
          {i18n.UPGRADE_ALL}
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
