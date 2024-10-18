/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import React, { useCallback } from 'react';
import type { RuleUpgradeState } from '../../../../rule_management/model/prebuilt_rule_upgrade';
import { useUserData } from '../../../../../detections/components/user_info';
import * as i18n from './translations';
import { useUpgradePrebuiltRulesTableContext } from './upgrade_prebuilt_rules_table_context';

interface UpgradePrebuiltRulesTableButtonsProps {
  selectedRules: RuleUpgradeState[];
}

export const UpgradePrebuiltRulesTableButtons = ({
  selectedRules,
}: UpgradePrebuiltRulesTableButtonsProps) => {
  const {
    state: {
      ruleUpgradeInfos,
      hasRulesToUpgrade,
      loadingRules,
      isRefetching,
      isUpgradingSecurityPackages,
      isPrebuiltRulesCustomizationEnabled,
    },
    actions: { upgradeRules },
  } = useUpgradePrebuiltRulesTableContext();
  const [{ loading: isUserDataLoading, canUserCRUD }] = useUserData();
  const canUserEditRules = canUserCRUD && !isUserDataLoading;

  const numberOfSelectedRules = selectedRules.length ?? 0;
  const shouldDisplayUpgradeSelectedRulesButton = numberOfSelectedRules > 0;

  const isRuleUpgrading = loadingRules.length > 0;
  const isRequestInProgress = isRuleUpgrading || isRefetching || isUpgradingSecurityPackages;
  const isAllSelectedRulesHaveConflicts =
    isPrebuiltRulesCustomizationEnabled && isAllRuleHaveConflicts(selectedRules);
  const isAllRulesHaveConflicts =
    isPrebuiltRulesCustomizationEnabled && isAllRuleHaveConflicts(ruleUpgradeInfos);

  const upgradeSelectedRules = useCallback(
    () => upgradeRules(selectedRules.map((rule) => rule.rule_id)),
    [selectedRules, upgradeRules]
  );

  const upgradeAllRules = useCallback(
    // Upgrade all rules, ignoring filter and selection
    () => upgradeRules(ruleUpgradeInfos.map((rule) => rule.rule_id)),
    [ruleUpgradeInfos, upgradeRules]
  );

  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap={true}>
      {shouldDisplayUpgradeSelectedRulesButton ? (
        <EuiFlexItem grow={false}>
          <EuiButton
            onClick={upgradeSelectedRules}
            disabled={!canUserEditRules || isRequestInProgress || isAllSelectedRulesHaveConflicts}
            data-test-subj="upgradeSelectedRulesButton"
          >
            <>
              {i18n.UPDATE_SELECTED_RULES(numberOfSelectedRules)}
              {isRuleUpgrading ? <EuiLoadingSpinner size="s" /> : undefined}
            </>
          </EuiButton>
        </EuiFlexItem>
      ) : null}
      <EuiFlexItem grow={false}>
        <EuiButton
          fill
          iconType="plusInCircle"
          onClick={upgradeAllRules}
          disabled={
            !canUserEditRules ||
            !hasRulesToUpgrade ||
            isRequestInProgress ||
            isAllRulesHaveConflicts
          }
          data-test-subj="upgradeAllRulesButton"
        >
          {i18n.UPDATE_ALL}
          {isRuleUpgrading ? <EuiLoadingSpinner size="s" /> : undefined}
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

function isAllRuleHaveConflicts(rules: Array<{ diff: { num_fields_with_conflicts: number } }>) {
  return rules.every((rule) => rule.diff.num_fields_with_conflicts > 0);
}
