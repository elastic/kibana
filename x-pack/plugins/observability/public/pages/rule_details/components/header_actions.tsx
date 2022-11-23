/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiButton,
  EuiButtonEmpty,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface HeaderActionsProps {
  loading: boolean;
  ruleId: string | undefined;
  onDeleteRule: (ruleId: string) => void;
  onEditRule: () => void;
}

export function HeaderActions({ loading, ruleId, onDeleteRule, onEditRule }: HeaderActionsProps) {
  const [isRuleEditPopoverOpen, setIsRuleEditPopoverOpen] = useState(false);

  const togglePopover = () => setIsRuleEditPopoverOpen(!isRuleEditPopoverOpen);

  const handleClosePopover = () => setIsRuleEditPopoverOpen(false);

  const handleEditRule = () => {
    setIsRuleEditPopoverOpen(false);

    onEditRule();
  };

  const handleRemoveRule = () => {
    setIsRuleEditPopoverOpen(false);

    if (ruleId) {
      onDeleteRule(ruleId);
    }
  };

  return (
    <EuiFlexGroup direction="rowReverse" alignItems="flexStart">
      <EuiFlexItem>
        <EuiPopover
          button={
            <EuiButton
              fill
              data-test-subj="actions"
              iconSide="right"
              iconType="arrowDown"
              isLoading={loading}
              onClick={togglePopover}
            >
              {i18n.translate('xpack.observability.ruleDetails.actionsButtonLabel', {
                defaultMessage: 'Actions',
              })}
            </EuiButton>
          }
          closePopover={handleClosePopover}
          isOpen={isRuleEditPopoverOpen}
        >
          <EuiFlexGroup direction="column" alignItems="flexStart" gutterSize="s">
            <EuiButtonEmpty
              data-test-subj="editRuleButton"
              size="s"
              iconType="pencil"
              onClick={handleEditRule}
            >
              <EuiText size="s">
                {i18n.translate('xpack.observability.ruleDetails.editRule', {
                  defaultMessage: 'Edit rule',
                })}
              </EuiText>
            </EuiButtonEmpty>

            <EuiButtonEmpty
              size="s"
              iconType="trash"
              color="danger"
              onClick={handleRemoveRule}
              data-test-subj="deleteRuleButton"
            >
              <EuiText size="s">
                {i18n.translate('xpack.observability.ruleDetails.deleteRule', {
                  defaultMessage: 'Delete rule',
                })}
              </EuiText>
            </EuiButtonEmpty>
          </EuiFlexGroup>
        </EuiPopover>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
