/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
} from '@elastic/eui';
import * as i18n from '../translations';
import { MaintenanceWindowStatus } from '../../../../common';

interface TableActionsPopoverProps {
  status: MaintenanceWindowStatus;
  onEdit: () => void;
  onCancel: () => void;
  onArchive: (archive: boolean) => void;
  onCancelAndArchive: () => void;
}

export const TableActionsPopover: React.FC<TableActionsPopoverProps> = React.memo(
  ({ status, onEdit, onCancel, onArchive, onCancelAndArchive }) => {
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);

    const onButtonClick = useCallback(() => {
      setIsPopoverOpen((open) => !open);
    }, []);
    const closePopover = useCallback(() => {
      setIsPopoverOpen(false);
    }, []);

    const items = useMemo(() => {
      const menuItems = [
        <EuiContextMenuItem
          key="edit"
          icon="pencil"
          onClick={() => {
            closePopover();
            onEdit();
          }}
        >
          {i18n.TABLE_ACTION_EDIT}
        </EuiContextMenuItem>,
      ];
      if (status === MaintenanceWindowStatus.Running) {
        menuItems.push(
          <EuiContextMenuItem
            key="cancel"
            icon="stopSlash"
            onClick={() => {
              closePopover();
              onCancel();
            }}
          >
            {i18n.TABLE_ACTION_CANCEL}
          </EuiContextMenuItem>
        );
        menuItems.push(
          <EuiContextMenuItem
            key="cancel-and-archive"
            icon="trash"
            onClick={() => {
              closePopover();
              onCancelAndArchive();
            }}
          >
            {i18n.TABLE_ACTION_CANCEL_AND_ARCHIVE}
          </EuiContextMenuItem>
        );
      }
      if (
        status !== MaintenanceWindowStatus.Running &&
        status !== MaintenanceWindowStatus.Archived
      ) {
        menuItems.push(
          <EuiContextMenuItem
            key="archive"
            icon="trash"
            onClick={() => {
              closePopover();
              onArchive(true);
            }}
          >
            {i18n.TABLE_ACTION_ARCHIVE}
          </EuiContextMenuItem>
        );
      }
      if (status === MaintenanceWindowStatus.Archived) {
        menuItems.push(
          <EuiContextMenuItem
            key="unarchive"
            icon="exit"
            onClick={() => {
              closePopover();
              onArchive(false);
            }}
          >
            {i18n.TABLE_ACTION_UNARCHIVE}
          </EuiContextMenuItem>
        );
      }
      return menuItems;
    }, [status, closePopover, onArchive, onCancel, onCancelAndArchive, onEdit]);

    return (
      <EuiFlexGroup justifyContent="flexEnd" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiPopover
            button={
              <EuiButtonIcon
                data-test-subj="upcoming-events-icon-button"
                iconType="boxesHorizontal"
                size="s"
                aria-label="Upcoming events"
                onClick={onButtonClick}
              />
            }
            isOpen={isPopoverOpen}
            closePopover={closePopover}
            panelPaddingSize="none"
            anchorPosition="downCenter"
          >
            <EuiContextMenuPanel items={items} />
          </EuiPopover>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);
TableActionsPopover.displayName = 'TableActionsPopover';
