/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import React from 'react';
import { useUserData } from '../../../../../detections/components/user_info';
import * as i18n from './translations';
import { useUpgradePrebuiltRulesTableContext } from './upgrade_prebuilt_rules_table_context';

export const UpgradePrebuiltRulesTableButtons = () => {
  const {
    state: { rules, selectedRules, loadingRules, isRefetching, isUpgradingSecurityPackages },
    actions: { upgradeAllRules, upgradeSelectedRules },
  } = useUpgradePrebuiltRulesTableContext();
  const [{ loading: isUserDataLoading, canUserCRUD }] = useUserData();
  const canUserEditRules = canUserCRUD && !isUserDataLoading;

  const isRulesAvailableForUpgrade = rules.length > 0;
  const numberOfSelectedRules = selectedRules.length ?? 0;
  const shouldDisplayUpgradeSelectedRulesButton = numberOfSelectedRules > 0;

  const isRuleUpgrading = loadingRules.length > 0;
  const isRequestInProgress = isRuleUpgrading || isRefetching || isUpgradingSecurityPackages;

  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap={true}>
      {shouldDisplayUpgradeSelectedRulesButton ? (
        <EuiFlexItem grow={false}>
          <EuiButton
            onClick={upgradeSelectedRules}
            disabled={!canUserEditRules || isRequestInProgress}
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
          disabled={!canUserEditRules || !isRulesAvailableForUpgrade || isRequestInProgress}
          data-test-subj="upgradeAllRulesButton"
        >
          {i18n.UPDATE_ALL}
          {isRuleUpgrading ? <EuiLoadingSpinner size="s" /> : undefined}
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
