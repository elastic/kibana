/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import {
  EuiPopover,
  EuiButtonIcon,
  EuiContextMenuPanel,
  EuiText,
  EuiContextMenuItem,
  EuiToolTip,
} from '@elastic/eui';
import { AddToCaseActionProps } from './add_to_case_action';
import { useAddToCase } from '../../../../hooks/use_add_to_case';
import { ActionIconItem } from '../../action_icon_item';
import * as i18n from './translations';

const AddToCaseActionButtonComponent: React.FC<AddToCaseActionProps> = ({
  ariaLabel = i18n.ACTION_ADD_TO_CASE_ARIA_LABEL,
  event,
  useInsertTimeline,
  casePermissions,
  appId,
  onClose,
}) => {
  const {
    addNewCaseClick,
    addExistingCaseClick,
    isDisabled,
    userCanCrud,
    isEventSupported,
    openPopover,
    closePopover,
    isPopoverOpen,
  } = useAddToCase({ event, useInsertTimeline, casePermissions, appId, onClose });
  const tooltipContext = userCanCrud
    ? isEventSupported
      ? i18n.ACTION_ADD_TO_CASE_TOOLTIP
      : i18n.UNSUPPORTED_EVENTS_MSG
    : i18n.PERMISSIONS_MSG;
  const items = useMemo(
    () => [
      <EuiContextMenuItem
        key="add-new-case-menu-item"
        onClick={addNewCaseClick}
        aria-label={i18n.ACTION_ADD_NEW_CASE}
        data-test-subj="add-new-case-item"
        disabled={isDisabled}
      >
        <EuiText size="m">{i18n.ACTION_ADD_NEW_CASE}</EuiText>
      </EuiContextMenuItem>,
      <EuiContextMenuItem
        key="add-existing-case-menu-item"
        onClick={addExistingCaseClick}
        aria-label={i18n.ACTION_ADD_EXISTING_CASE}
        data-test-subj="add-existing-case-menu-item"
        disabled={isDisabled}
      >
        <EuiText size="m">{i18n.ACTION_ADD_EXISTING_CASE}</EuiText>
      </EuiContextMenuItem>,
    ],
    [addExistingCaseClick, addNewCaseClick, isDisabled]
  );

  const button = useMemo(
    () => (
      <EuiToolTip data-test-subj="attach-alert-to-case-tooltip" content={tooltipContext}>
        <EuiButtonIcon
          aria-label={ariaLabel}
          data-test-subj="attach-alert-to-case-button"
          size="s"
          iconType="folderClosed"
          onClick={openPopover}
          isDisabled={isDisabled}
        />
      </EuiToolTip>
    ),
    [ariaLabel, isDisabled, openPopover, tooltipContext]
  );

  return (
    <>
      {userCanCrud && (
        <ActionIconItem>
          <EuiPopover
            id="attachAlertToCasePanel"
            button={button}
            isOpen={isPopoverOpen}
            closePopover={closePopover}
            panelPaddingSize="none"
            anchorPosition="downLeft"
            repositionOnScroll
          >
            <EuiContextMenuPanel items={items} />
          </EuiPopover>
        </ActionIconItem>
      )}
    </>
  );
};

export const AddToCaseActionButton = memo(AddToCaseActionButtonComponent);

// eslint-disable-next-line import/no-default-export
export default AddToCaseActionButton;
