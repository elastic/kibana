/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButton, EuiButtonEmpty, EuiFlexGroup, EuiPopover, EuiText } from '@elastic/eui';
import { HeaderActionsProps } from '../types';

export function HeaderActions({
  onAddToExistingCase,
  onCreateNewCase,
  onSnoozeRule,
}: HeaderActionsProps) {
  const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);

  const togglePopover = () => setIsPopoverOpen(!isPopoverOpen);

  const handleClosePopover = () => setIsPopoverOpen(false);

  return (
    <EuiPopover
      isOpen={isPopoverOpen}
      closePopover={handleClosePopover}
      button={
        <EuiButton
          fill
          iconType="arrowDown"
          iconSide="right"
          onClick={togglePopover}
          data-test-subj="alert-details-actions-menu-button"
        >
          {i18n.translate('xpack.observability.alertDetails.actionsButtonLabel', {
            defaultMessage: 'Actions',
          })}
        </EuiButton>
      }
    >
      <EuiFlexGroup direction="column" alignItems="flexStart">
        <EuiButtonEmpty
          size="s"
          color="text"
          onClick={onAddToExistingCase}
          data-test-subj="add-to-existing-case-button"
        >
          <EuiText size="s">
            {i18n.translate('xpack.observability.alertDetails.addToExistingCase', {
              defaultMessage: 'Add to existing case',
            })}
          </EuiText>
        </EuiButtonEmpty>
        <EuiButtonEmpty
          size="s"
          color="text"
          onClick={onCreateNewCase}
          data-test-subj="create-new-case-button"
        >
          <EuiText size="s">
            {i18n.translate('xpack.observability.alertDetails.createNewCaseButton', {
              defaultMessage: 'Add to new case',
            })}
          </EuiText>
        </EuiButtonEmpty>
        <EuiButtonEmpty
          size="s"
          color="text"
          onClick={onSnoozeRule}
          data-test-subj="edit-snooze-rule-button"
        >
          <EuiText size="s">
            {i18n.translate('xpack.observability.alertDetails.editSnoozeRule', {
              defaultMessage: 'Edit or snooze the rule',
            })}
          </EuiText>
        </EuiButtonEmpty>
      </EuiFlexGroup>
    </EuiPopover>
  );
}
