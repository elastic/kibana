/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo, useState } from 'react';
import { EuiPopover, EuiPopoverTitle, EuiButton } from '@elastic/eui';
import { caseStatuses, CaseStatuses } from '../../../common/api';
import { Status, statuses } from '../status';
import { CHANGE_STATUS } from '../all_cases/translations';

interface Props {
  currentStatus: CaseStatuses;
  disabled?: boolean;
  onStatusChanged: (status: CaseStatuses) => void;
}

const StatusContextMenuComponent: React.FC<Props> = ({
  currentStatus,
  disabled = false,
  onStatusChanged,
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const closePopover = useCallback(() => setIsPopoverOpen(false), []);
  const openPopover = useCallback(() => setIsPopoverOpen(true), []);

  const popOverButton = useMemo(
    () => (
      <EuiButton
        size="s"
        disabled={disabled}
        onClick={openPopover}
        iconType="arrowDown"
        minWidth={50}
        fill
        color={statuses[currentStatus].color}
        iconSide="right"
      >
        {statuses[currentStatus].label}
      </EuiButton>
    ),
    [disabled, currentStatus, openPopover]
  );

  const onContextMenuItemClick = useCallback(
    (status: CaseStatuses) => {
      closePopover();
      if (currentStatus !== status) {
        onStatusChanged(status);
      }
    },
    [closePopover, currentStatus, onStatusChanged]
  );

  const selectableStatuses = caseStatuses.filter((status) => status !== currentStatus);

  const panelItems = useMemo(
    () =>
      selectableStatuses.map((status: CaseStatuses) => {
        return (
          <EuiButton
            data-test-subj={`case-view-status-dropdown-${status}`}
            size="s"
            color={statuses[status].color}
            fullWidth
            fill
            onClick={() => onContextMenuItemClick(status)}
          >
            {statuses[status].label}
          </EuiButton>
        );
      }),
    [onContextMenuItemClick, selectableStatuses]
  );

  return (
    <EuiPopover
      anchorPosition="downLeft"
      button={popOverButton}
      closePopover={closePopover}
      data-test-subj="case-view-status-dropdown"
      id="caseStatusPopover"
      isOpen={isPopoverOpen}
      panelPaddingSize="s"
    >
      <>
        <EuiPopoverTitle>
          <h4>{CHANGE_STATUS}</h4>
        </EuiPopoverTitle>
        {panelItems}
      </>
    </EuiPopover>
  );
};
StatusContextMenuComponent.displayName = 'StatusContextMenu';

export const StatusContextMenu = memo(StatusContextMenuComponent);
