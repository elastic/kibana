/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo, useState } from 'react';
import { EuiPopover, EuiContextMenuPanel, EuiContextMenuItem } from '@elastic/eui';
import { caseStatuses, CaseStatuses } from '../../../common';
import { Status } from '../status';

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
    () => <Status disabled={disabled} type={currentStatus} withArrow onClick={openPopover} />,
    [disabled, currentStatus, openPopover]
  );

  const onContextMenuItemClick = useCallback(
    (status: CaseStatuses) => {
      closePopover();
      onStatusChanged(status);
    },
    [closePopover, onStatusChanged]
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
          <Status type={status} />
        </EuiContextMenuItem>
      )),
    [currentStatus, onContextMenuItemClick]
  );

  return (
    <>
      <EuiPopover
        anchorPosition="downLeft"
        button={popOverButton}
        closePopover={closePopover}
        data-test-subj="case-view-status-dropdown"
        id="caseStatusPopover"
        isOpen={isPopoverOpen}
      >
        <EuiContextMenuPanel items={panelItems} />
      </EuiPopover>
    </>
  );
};

export const StatusContextMenu = memo(StatusContextMenuComponent);
