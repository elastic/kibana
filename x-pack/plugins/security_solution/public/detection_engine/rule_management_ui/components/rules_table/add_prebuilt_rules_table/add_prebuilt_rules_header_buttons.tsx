/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPopover,
} from '@elastic/eui';
import React, { useState } from 'react';
import { useUserData } from '../../../../../detections/components/user_info';
import { useAddPrebuiltRulesTableContext } from './add_prebuilt_rules_table_context';
import * as i18n from './translations';

export const AddPrebuiltRulesHeaderButtons = () => {
  const {
    state: {
      selectedRules,
      loadingRules,
      isRefetching,
      isUpgradingSecurityPackages,
      hasRulesToInstall,
    },
    actions: { installAllRules, installSelectedRules },
  } = useAddPrebuiltRulesTableContext();
  const [{ loading: isUserDataLoading, canUserCRUD }] = useUserData();
  const canUserEditRules = canUserCRUD && !isUserDataLoading;

  const numberOfSelectedRules = selectedRules.length ?? 0;
  const shouldDisplayInstallSelectedRulesButton = numberOfSelectedRules > 0;

  const isRuleInstalling = loadingRules.length > 0;
  const isRequestInProgress = isRuleInstalling || isRefetching || isUpgradingSecurityPackages;

  const [isOverflowPopoverOpen, setOverflowPopover] = useState(false);

  const onButtonClick = () => {
    setOverflowPopover(!isOverflowPopoverOpen);
  };

  const closeOverflowPopover = () => {
    setOverflowPopover(false);
  };

  const enableOnClick = () => {
    installSelectedRules(true);
    closeOverflowPopover();
  };

  const overflowItems = [
    <EuiContextMenuItem key="copy" icon={'play'} onClick={enableOnClick}>
      {i18n.INSTALL_AND_ENABLE_BUTTON_LABEL}
    </EuiContextMenuItem>,
  ];

  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap={true}>
      {shouldDisplayInstallSelectedRulesButton ? (
        <>
          <EuiFlexItem grow={false}>
            <EuiButton
              onClick={() => installSelectedRules()}
              disabled={!canUserEditRules || isRequestInProgress}
              data-test-subj="installSelectedRulesButton"
            >
              {i18n.INSTALL_SELECTED_RULES(numberOfSelectedRules)}
              {isRuleInstalling ? <EuiLoadingSpinner size="s" /> : undefined}
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiPopover
              button={
                <EuiButtonIcon
                  display="base"
                  size="m"
                  iconType="boxesVertical"
                  aria-label={i18n.INSTALL_RULES_OVERFLOW_BUTTON_ARIA_LABEL}
                  onClick={onButtonClick}
                  disabled={!canUserEditRules || isRequestInProgress}
                />
              }
              isOpen={isOverflowPopoverOpen}
              closePopover={closeOverflowPopover}
              panelPaddingSize="s"
              anchorPosition="downRight"
            >
              <EuiContextMenuPanel size="s" items={overflowItems} />
            </EuiPopover>
          </EuiFlexItem>
        </>
      ) : null}
      <EuiFlexItem grow={false}>
        <EuiButton
          fill
          iconType="plusInCircle"
          data-test-subj="installAllRulesButton"
          onClick={installAllRules}
          disabled={!canUserEditRules || !hasRulesToInstall || isRequestInProgress}
          aria-label={i18n.INSTALL_ALL_ARIA_LABEL}
        >
          {i18n.INSTALL_ALL}
          {isRuleInstalling ? <EuiLoadingSpinner size="s" /> : undefined}
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
