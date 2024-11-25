/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner, EuiToolTip } from '@elastic/eui';
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
  const doAllSelectedRulesHaveConflicts =
    isPrebuiltRulesCustomizationEnabled && isAllRuleHaveConflicts(selectedRules);
  const doAllRulesHaveConflicts =
    isPrebuiltRulesCustomizationEnabled && isAllRuleHaveConflicts(ruleUpgradeInfos);

  const { selectedRulesButtonTooltip, allRulesButtonTooltip } = useBulkUpdateButtonsTooltipContent({
    canUserEditRules,
    doAllSelectedRulesHaveConflicts,
    doAllRulesHaveConflicts,
    isPrebuiltRulesCustomizationEnabled,
  });

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
          <EuiToolTip content={selectedRulesButtonTooltip}>
            <EuiButton
              onClick={upgradeSelectedRules}
              disabled={!canUserEditRules || isRequestInProgress || doAllSelectedRulesHaveConflicts}
              data-test-subj="upgradeSelectedRulesButton"
            >
              <>
                {i18n.UPDATE_SELECTED_RULES(numberOfSelectedRules)}
                {isRuleUpgrading ? <EuiLoadingSpinner size="s" /> : undefined}
              </>
            </EuiButton>
          </EuiToolTip>
        </EuiFlexItem>
      ) : null}
      <EuiFlexItem grow={false}>
        <EuiToolTip content={allRulesButtonTooltip}>
          <EuiButton
            fill
            iconType="plusInCircle"
            onClick={upgradeAllRules}
            disabled={
              !canUserEditRules ||
              !hasRulesToUpgrade ||
              isRequestInProgress ||
              doAllRulesHaveConflicts
            }
            data-test-subj="upgradeAllRulesButton"
          >
            {i18n.UPDATE_ALL}
            {isRuleUpgrading ? <EuiLoadingSpinner size="s" /> : undefined}
          </EuiButton>
        </EuiToolTip>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const useBulkUpdateButtonsTooltipContent = ({
  canUserEditRules,
  doAllSelectedRulesHaveConflicts,
  doAllRulesHaveConflicts,
  isPrebuiltRulesCustomizationEnabled,
}: {
  canUserEditRules: boolean | null;
  doAllSelectedRulesHaveConflicts: boolean;
  doAllRulesHaveConflicts: boolean;
  isPrebuiltRulesCustomizationEnabled: boolean;
}) => {
  if (!canUserEditRules) {
    return {
      selectedRulesButtonTooltip: i18n.BULK_UPDATE_BUTTON_TOOLTIP_NO_PERMISSIONS,
      allRulesButtonTooltip: i18n.BULK_UPDATE_BUTTON_TOOLTIP_NO_PERMISSIONS,
    };
  }

  if (!isPrebuiltRulesCustomizationEnabled) {
    return {
      selectedRulesButtonTooltip: undefined,
      allRulesButtonTooltip: undefined,
    };
  }

  if (doAllRulesHaveConflicts) {
    return {
      selectedRulesButtonTooltip: i18n.BULK_UPDATE_SELECTED_RULES_BUTTON_TOOLTIP_CONFLICTS,
      allRulesButtonTooltip: i18n.BULK_UPDATE_ALL_RULES_BUTTON_TOOLTIP_CONFLICTS,
    };
  }

  if (doAllSelectedRulesHaveConflicts) {
    return {
      selectedRulesButtonTooltip: i18n.BULK_UPDATE_SELECTED_RULES_BUTTON_TOOLTIP_CONFLICTS,
      allRulesButtonTooltip: undefined,
    };
  }

  return {
    selectedRulesButtonTooltip: undefined,
    allRulesButtonTooltip: undefined,
  };
};

function isAllRuleHaveConflicts(rules: Array<{ diff: { num_fields_with_conflicts: number } }>) {
  return rules.every((rule) => rule.diff.num_fields_with_conflicts > 0);
}
