/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo, useCallback, useState } from 'react';

import { i18n } from '@kbn/i18n';
import { EuiFilterButton, EuiFilterGroup, EuiToolTip } from '@elastic/eui';

import { TEST_IDS } from './constants';
import { AssigneesPopover } from '../assignees/assignees_popover';
import type { AssigneesIdsSelection } from '../assignees/types';
import { useLicense } from '../../hooks/use_license';
import { useUpsellingMessage } from '../../hooks/use_upselling';

export interface FilterByAssigneesPopoverProps {
  /**
   * Ids of the users assigned to the alert
   */
  assignedUserIds: AssigneesIdsSelection[];

  /**
   * Callback to handle changing of the assignees selection
   */
  onSelectionChange?: (users: AssigneesIdsSelection[]) => void;
}

/**
 * The popover to filter alerts by assigned users
 */
export const FilterByAssigneesPopover: FC<FilterByAssigneesPopoverProps> = memo(
  ({ assignedUserIds, onSelectionChange }) => {
    const isPlatinumPlus = useLicense().isPlatinumPlus();
    const upsellingMessage = useUpsellingMessage('alert_assignments');

    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const togglePopover = useCallback(() => setIsPopoverOpen((value) => !value), []);

    const [selectedAssignees, setSelectedAssignees] =
      useState<AssigneesIdsSelection[]>(assignedUserIds);
    const handleSelectionChange = useCallback(
      (users: AssigneesIdsSelection[]) => {
        setSelectedAssignees(users);
        onSelectionChange?.(users);
      },
      [onSelectionChange]
    );

    return (
      <EuiFilterGroup>
        <AssigneesPopover
          assignedUserIds={assignedUserIds}
          showUnassignedOption={true}
          button={
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
                data-test-subj={TEST_IDS.FILTER_BY_ASSIGNEES_BUTTON}
                iconType="arrowDown"
                badgeColor="subdued"
                disabled={!isPlatinumPlus}
                onClick={togglePopover}
                isSelected={isPopoverOpen}
                hasActiveFilters={selectedAssignees.length > 0}
                numActiveFilters={selectedAssignees.length}
              >
                {i18n.translate('xpack.securitySolution.filtersGroup.assignees.buttonTitle', {
                  defaultMessage: 'Assignees',
                })}
              </EuiFilterButton>
            </EuiToolTip>
          }
          isPopoverOpen={isPopoverOpen}
          closePopover={togglePopover}
          onSelectionChange={handleSelectionChange}
        />
      </EuiFilterGroup>
    );
  }
);

FilterByAssigneesPopover.displayName = 'FilterByAssigneesPopover';
