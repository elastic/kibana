/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo, useState } from 'react';
import { memoize } from 'lodash/fp';
import { EuiPopover, EuiContextMenuPanel, EuiContextMenuItem } from '@elastic/eui';
import { caseStatuses, CaseStatuses } from '../../../common';
import { Status } from '../status';

interface Props {
  currentStatus: CaseStatuses;
  onStatusChanged: (status: CaseStatuses) => void;
}

const StatusContextMenuComponent: React.FC<Props> = ({ currentStatus, onStatusChanged }) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const closePopover = useCallback(() => setIsPopoverOpen(false), []);
  const openPopover = useCallback(() => setIsPopoverOpen(true), []);
  const popOverButton = useMemo(
    () => <Status type={currentStatus} withArrow onClick={openPopover} />,
    [currentStatus, openPopover]
  );

  const onContextMenuItemClick = useMemo(
    () =>
      memoize<(status: CaseStatuses) => () => void>((status) => () => {
        closePopover();
        onStatusChanged(status);
      }),
    [closePopover, onStatusChanged]
  );

  const panelItems = caseStatuses.map((status: CaseStatuses) => (
    <EuiContextMenuItem
      key={status}
      icon={status === currentStatus ? 'check' : 'empty'}
      onClick={onContextMenuItemClick(status)}
      data-test-subj={`case-view-status-dropdown-${status}`}
    >
      <Status type={status} />
    </EuiContextMenuItem>
  ));

  return (
    <>
      <EuiPopover
        id="caseStatusPopover"
        button={popOverButton}
        isOpen={isPopoverOpen}
        closePopover={closePopover}
        anchorPosition="downLeft"
        data-test-subj="case-view-status-dropdown"
      >
        <EuiContextMenuPanel items={panelItems} />
      </EuiPopover>
    </>
  );
};

export const StatusContextMenu = memo(StatusContextMenuComponent);
