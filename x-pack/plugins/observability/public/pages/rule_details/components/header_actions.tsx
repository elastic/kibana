/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface HeaderActionsProps {
  isLoading: boolean;
  isRuleEditable: boolean;
  onDeleteRule: () => void;
  onEditRule: () => void;
}

export function HeaderActions({
  isLoading,
  isRuleEditable,
  onDeleteRule,
  onEditRule,
}: HeaderActionsProps) {
  const [isRuleEditPopoverOpen, setIsRuleEditPopoverOpen] = useState(false);

  const togglePopover = () => setIsRuleEditPopoverOpen(!isRuleEditPopoverOpen);

  const handleEditRule = () => {
    setIsRuleEditPopoverOpen(false);
    onEditRule();
  };

  const handleRemoveRule = () => {
    setIsRuleEditPopoverOpen(false);
    onDeleteRule();
  };

  return isRuleEditable ? (
    <EuiFlexGroup direction="rowReverse" alignItems="flexStart">
      <EuiFlexItem>
        <EuiPopover
          id="contextRuleEditMenu"
          isOpen={isRuleEditPopoverOpen}
          closePopover={togglePopover}
          button={
            <EuiButton
              data-test-subj="actions"
              disabled={isLoading}
              fill
              iconSide="right"
              iconType="arrowDown"
              onClick={togglePopover}
            >
              {i18n.translate('xpack.observability.ruleDetails.actionsButtonLabel', {
                defaultMessage: 'Actions',
              })}
            </EuiButton>
          }
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
  ) : null;
}
