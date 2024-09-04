/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPopover,
} from '@elastic/eui';
import React, { useState } from 'react';
import type { Rule } from '../../../../rule_management/logic';
import type { RuleSignatureId } from '../../../../../../common/api/detection_engine';
import type { AddPrebuiltRulesTableActions } from './add_prebuilt_rules_table_context';
import * as i18n from './translations';

export const PrebuiltRulesInstallButton = ({
  ruleId,
  record,
  installOneRule,
  loadingRules,
  isDisabled,
}: {
  ruleId: RuleSignatureId;
  record: Rule;
  installOneRule: AddPrebuiltRulesTableActions['installOneRule'];
  loadingRules: RuleSignatureId[];
  isDisabled: boolean;
}) => {
  const isRuleInstalling = loadingRules.includes(ruleId);
  const isInstallButtonDisabled = isRuleInstalling || isDisabled;
  const [isPopoverOpen, setPopover] = useState(false);

  const onOverflowButtonClick = () => {
    setPopover(!isPopoverOpen);
  };

  const closeOverflowPopover = () => {
    setPopover(false);
  };

  const enableOnClick = () => {
    installOneRule(ruleId, true);
    closeOverflowPopover();
  };

  const overflowItems = [
    <EuiContextMenuItem key="copy" icon={'play'} onClick={enableOnClick}>
      {i18n.INSTALL_AND_ENABLE_BUTTON_LABEL}
    </EuiContextMenuItem>,
  ];

  return (
    <>
      {isRuleInstalling ? (
        <EuiLoadingSpinner
          size="s"
          data-test-subj={`installSinglePrebuiltRuleButton-loadingSpinner-${ruleId}`}
        />
      ) : (
        <EuiFlexGroup responsive={false} gutterSize="xs" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="s"
              disabled={isInstallButtonDisabled}
              onClick={() => installOneRule(ruleId)}
              data-test-subj={`installSinglePrebuiltRuleButton-${ruleId}`}
              aria-label={i18n.INSTALL_RULE_BUTTON_ARIA_LABEL(record.name)}
            >
              {i18n.INSTALL_BUTTON_LABEL}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiPopover
              button={
                <EuiButtonIcon
                  display="empty"
                  size="s"
                  iconType="boxesVertical"
                  aria-label={i18n.INSTALL_RULES_OVERFLOW_BUTTON_ARIA_LABEL}
                  onClick={onOverflowButtonClick}
                  disabled={isInstallButtonDisabled}
                />
              }
              isOpen={isPopoverOpen}
              closePopover={closeOverflowPopover}
              panelPaddingSize="s"
              anchorPosition="downRight"
            >
              <EuiContextMenuPanel size="s" items={overflowItems} />
            </EuiPopover>
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
    </>
  );
};
