/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo, useCallback, useMemo, useState } from 'react';

import { i18n } from '@kbn/i18n';
import {
  EuiFilterButton,
  EuiFilterGroup,
  EuiPopover,
  EuiToolTip,
  useGeneratedHtmlId,
} from '@elastic/eui';

import type { AssigneesIdsSelection } from '../assignees/types';
import { useLicense } from '../../hooks/use_license';
import { useUpsellingMessage } from '../../hooks/use_upselling';
import { ASSIGNEES_PANEL_WIDTH } from '../assignees/constants';
import { AssigneesSelectable } from '../assignees/assignees_selectable';
import { FILTER_BY_ASSIGNEES_BUTTON } from './test_ids';

export interface FilterByAssigneesPopoverProps {
  /**
   * Selected user ids to filter alerts by
   */
  selectedUserIds: AssigneesIdsSelection[];

  /**
   * Callback to handle changing of the assignees selection
   */
  onSelectionChange?: (users: AssigneesIdsSelection[]) => void;
}

/**
 * The popover to filter alerts by assigned users
 */
export const FilterByAssigneesPopover: FC<FilterByAssigneesPopoverProps> = memo(
  ({ selectedUserIds, onSelectionChange }) => {
    const isPlatinumPlus = useLicense().isPlatinumPlus();
    const upsellingMessage = useUpsellingMessage('alert_assignments');

    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const togglePopover = useCallback(() => setIsPopoverOpen((value) => !value), []);

    const searchInputId = useGeneratedHtmlId({
      prefix: 'searchInput',
    });

    const button = useMemo(
      () => (
        <EuiToolTip
          position="bottom"
          content={
            upsellingMessage ??
            i18n.translate('xpack.securitySolution.filtersGroup.assignees.popoverTooltip', {
              defaultMessage: 'Filter by assignee',
            })
          }
        >
          <EuiFilterButton
            data-test-subj={FILTER_BY_ASSIGNEES_BUTTON}
            iconType="arrowDown"
            badgeColor="subdued"
            disabled={!isPlatinumPlus}
            onClick={togglePopover}
            isSelected={isPopoverOpen}
            hasActiveFilters={selectedUserIds.length > 0}
            numActiveFilters={selectedUserIds.length}
          >
            {i18n.translate('xpack.securitySolution.filtersGroup.assignees.buttonTitle', {
              defaultMessage: 'Assignees',
            })}
          </EuiFilterButton>
        </EuiToolTip>
      ),
      [isPlatinumPlus, isPopoverOpen, selectedUserIds.length, togglePopover, upsellingMessage]
    );

    return (
      <EuiFilterGroup>
        <EuiPopover
          panelPaddingSize="none"
          initialFocus={`[id="${searchInputId}"]`}
          button={button}
          isOpen={isPopoverOpen}
          panelStyle={{
            minWidth: ASSIGNEES_PANEL_WIDTH,
          }}
          closePopover={togglePopover}
        >
          <AssigneesSelectable
            searchInputId={searchInputId}
            assignedUserIds={selectedUserIds}
            showUnassignedOption={true}
            onSelectionChange={onSelectionChange}
          />
        </EuiPopover>
      </EuiFilterGroup>
    );
  }
);

FilterByAssigneesPopover.displayName = 'FilterByAssigneesPopover';
