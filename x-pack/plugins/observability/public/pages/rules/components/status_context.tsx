/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  EuiPopover,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiLoadingSpinner,
} from '@elastic/eui';
import { Status } from './status';
import { RuleStatus, StatusContextProps } from '../types';
import { statusMap } from '../config';

export function StatusContext({
  item,
  onStatusChanged,
  enableRule,
  disableRule,
  muteRule,
}: StatusContextProps) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const togglePopover = useCallback(() => setIsPopoverOpen(!isPopoverOpen), [isPopoverOpen]);

  const currentStatus = item.enabled ? RuleStatus.enabled : RuleStatus.disabled;
  const popOverButton = useMemo(
    () => <Status type={currentStatus} onClick={togglePopover} />,
    [currentStatus, togglePopover]
  );

  const onContextMenuItemClick = useCallback(
    async (status: RuleStatus) => {
      togglePopover();
      if (currentStatus !== status) {
        setIsUpdating(true);

        if (status === RuleStatus.enabled) {
          await enableRule({ ...item, enabled: true });
        } else if (status === RuleStatus.disabled) {
          await disableRule({ ...item, enabled: false });
        }
        setIsUpdating(false);
        onStatusChanged(status);
      }
    },
    [item, togglePopover, enableRule, disableRule, currentStatus, onStatusChanged]
  );
  const panelItems = useMemo(
    () =>
      Object.values(RuleStatus).map((status: RuleStatus) => (
        <EuiContextMenuItem
          icon={status === currentStatus ? 'check' : 'empty'}
          key={status}
          onClick={() => onContextMenuItemClick(status)}
        >
          {statusMap[status].label}
        </EuiContextMenuItem>
      )),
    [currentStatus, onContextMenuItemClick]
  );

  return isUpdating ? (
    <EuiLoadingSpinner data-test-subj="enableSpinner" size="m" />
  ) : (
    <EuiPopover
      button={popOverButton}
      closePopover={() => setIsPopoverOpen(false)}
      anchorPosition="downLeft"
      isOpen={isPopoverOpen}
      panelPaddingSize="none"
    >
      <EuiContextMenuPanel items={panelItems} />
    </EuiPopover>
  );
}
