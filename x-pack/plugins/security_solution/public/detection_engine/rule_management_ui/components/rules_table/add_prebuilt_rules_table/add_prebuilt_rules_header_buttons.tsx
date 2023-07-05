/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import React from 'react';
import { useAddPrebuiltRulesTableContext } from './add_prebuilt_rules_table_context';
import * as i18n from './translations';

export const AddPrebuiltRulesHeaderButtons = () => {
  const {
    state: { rules, selectedRules, loadingRules, isRefetching, isUpgradingSecurityPackages },
    actions: { installAllRules, installSelectedRules },
  } = useAddPrebuiltRulesTableContext();

  const isRulesAvailableForInstall = rules.length > 0;
  const numberOfSelectedRules = selectedRules.length ?? 0;
  const shouldDisplayInstallSelectedRulesButton = numberOfSelectedRules > 0;

  const isRuleInstalling = loadingRules.length > 0;
  const isRequestInProgress = isRuleInstalling || isRefetching || isUpgradingSecurityPackages;

  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap={true}>
      {shouldDisplayInstallSelectedRulesButton ? (
        <EuiFlexItem grow={false}>
          <EuiButton
            onClick={installSelectedRules}
            disabled={isRequestInProgress}
            data-test-subj="installSelectedRulesButton"
          >
            {i18n.INSTALL_SELECTED_RULES(numberOfSelectedRules)}
            {isRuleInstalling ? <EuiLoadingSpinner size="s" /> : undefined}
          </EuiButton>
        </EuiFlexItem>
      ) : null}
      <EuiFlexItem grow={false}>
        <EuiButton
          fill
          iconType="plusInCircle"
          data-test-subj="installAllRulesButton"
          onClick={installAllRules}
          disabled={!isRulesAvailableForInstall || isRequestInProgress}
        >
          {i18n.INSTALL_ALL}
          {isRuleInstalling ? <EuiLoadingSpinner size="s" /> : undefined}
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
