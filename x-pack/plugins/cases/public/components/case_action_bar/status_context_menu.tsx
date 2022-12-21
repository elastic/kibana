/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo, useState } from 'react';
import { EuiPopover, EuiContextMenuPanel, EuiContextMenuItem } from '@elastic/eui';
import { Status } from '@kbn/cases-components';
import type { CaseStatuses } from '../../../common/api';
import { caseStatuses } from '../../../common/api';
import { StatusPopoverButton } from '../status';
import { CHANGE_STATUS } from '../all_cases/translations';

interface Props {
  currentStatus: CaseStatuses;
  disabled?: boolean;
  isLoading?: boolean;
  onStatusChanged: (status: CaseStatuses) => void;
}

const StatusContextMenuComponent: React.FC<Props> = ({
  currentStatus,
  disabled = false,
  isLoading = false,
  onStatusChanged,
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const togglePopover = useCallback(
    () => setIsPopoverOpen((prevPopoverStatus) => !prevPopoverStatus),
    []
  );

  const closePopover = useCallback(() => setIsPopoverOpen(false), []);

  const popOverButton = useMemo(
    () => (
      <StatusPopoverButton
        disabled={disabled || isLoading}
        status={currentStatus}
        onClick={togglePopover}
      />
    ),
    [disabled, currentStatus, togglePopover, isLoading]
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

  const panelItems = useMemo(
    () =>
      caseStatuses.map((status: CaseStatuses) => (
        <EuiContextMenuItem
          data-test-subj={`case-view-status-dropdown-${status}`}
          icon={status === currentStatus ? 'check' : 'empty'}
          key={status}
          onClick={() => onContextMenuItemClick(status)}
        >
          <Status status={status} />
        </EuiContextMenuItem>
      )),
    [currentStatus, onContextMenuItemClick]
  );

  if (disabled) {
    return <Status status={currentStatus} />;
  }

  return (
    <EuiPopover
      anchorPosition="downLeft"
      button={popOverButton}
      closePopover={closePopover}
      data-test-subj="case-view-status-dropdown"
      id="caseStatusPopover"
      isOpen={isPopoverOpen}
      panelPaddingSize="none"
    >
      <EuiContextMenuPanel title={CHANGE_STATUS} items={panelItems} />
    </EuiPopover>
  );
};

StatusContextMenuComponent.displayName = 'StatusContextMenu';

export const StatusContextMenu = memo(StatusContextMenuComponent);
