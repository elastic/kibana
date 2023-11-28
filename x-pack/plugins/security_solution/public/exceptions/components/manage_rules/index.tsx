/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { FC } from 'react';
import React, { memo } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { Rule } from '../../../detection_engine/rule_management/logic/types';
import { ExceptionsAddToRulesTable } from '../../../detection_engine/rule_exceptions/components/flyout_components/add_to_rules_table';
import * as i18n from '../../translations';

interface ManageRulesProps {
  linkedRules: Rule[];
  showButtonLoader?: boolean;
  saveIsDisabled?: boolean;
  onSave: () => void;
  onCancel: () => void;
  onRuleSelectionChange: (rulesSelectedToAdd: Rule[]) => void;
}

export const ManageRules: FC<ManageRulesProps> = memo(
  ({
    linkedRules,
    showButtonLoader,
    saveIsDisabled = true,
    onSave,
    onCancel,
    onRuleSelectionChange,
  }) => {
    const complicatedFlyoutTitleId = useGeneratedHtmlId({
      prefix: 'complicatedFlyoutTitle',
    });

    return (
      <EuiFlyout
        hideCloseButton
        ownFocus
        onClose={onCancel}
        aria-labelledby={complicatedFlyoutTitleId}
      >
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m">
            <h2 id={complicatedFlyoutTitleId}>{i18n.LINK_RULES_HEADER}</h2>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiText size="s" color="subdued">
            {i18n.MANAGE_RULES_DESCRIPTION}
          </EuiText>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <ExceptionsAddToRulesTable
            initiallySelectedRules={linkedRules}
            onRuleSelectionChange={onRuleSelectionChange}
          />
        </EuiFlyoutBody>
        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty onClick={onCancel} flush="left">
                {i18n.MANAGE_RULES_CANCEL}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                data-test-subj="manageListRulesSaveButton"
                isLoading={showButtonLoader}
                disabled={saveIsDisabled}
                onClick={onSave}
                fill
              >
                {i18n.MANAGE_RULES_SAVE}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </EuiFlyout>
    );
  }
);
ManageRules.displayName = 'ManageRules';
