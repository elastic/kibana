/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, ReactNode } from 'react';
import React, { memo } from 'react';

import { EuiPopover, useGeneratedHtmlId } from '@elastic/eui';

import { ASSIGNEES_PANEL_WIDTH } from './constants';
import { AssigneesApplyPanel } from './assignees_apply_panel';
import type { AssigneesIdsSelection } from './types';

export interface AssigneesPopoverProps {
  /**
   * Ids of the users assigned to the alert
   */
  assignedUserIds: AssigneesIdsSelection[];

  /**
   * Show "Unassigned" option if needed
   */
  showUnassignedOption?: boolean;

  /**
   * Triggering element for which to align the popover to
   */
  button: NonNullable<ReactNode>;

  /**
   * Boolean to allow popover to be opened or closed
   */
  isPopoverOpen: boolean;

  /**
   * Callback to handle hiding of the popover
   */
  closePopover: () => void;

  /**
   * Callback to handle changing of the assignees selection
   */
  onSelectionChange?: (users: AssigneesIdsSelection[]) => void;

  /**
   * Callback to handle applying assignees
   */
  onAssigneesApply?: (selectedAssignees: AssigneesIdsSelection[]) => void;
}

/**
 * The popover to allow selection of users from a list
 */
export const AssigneesPopover: FC<AssigneesPopoverProps> = memo(
  ({
    assignedUserIds,
    showUnassignedOption,
    button,
    isPopoverOpen,
    closePopover,
    onSelectionChange,
    onAssigneesApply,
  }) => {
    const searchInputId = useGeneratedHtmlId({
      prefix: 'searchInput',
    });

    return (
      <EuiPopover
        panelPaddingSize="none"
        initialFocus={`#${searchInputId}`}
        button={button}
        isOpen={isPopoverOpen}
        panelStyle={{
          minWidth: ASSIGNEES_PANEL_WIDTH,
        }}
        closePopover={closePopover}
      >
        <AssigneesApplyPanel
          searchInputId={searchInputId}
          assignedUserIds={assignedUserIds}
          showUnassignedOption={showUnassignedOption}
          onSelectionChange={onSelectionChange}
          onAssigneesApply={onAssigneesApply}
        />
      </EuiPopover>
    );
  }
);

AssigneesPopover.displayName = 'AssigneesPopover';
