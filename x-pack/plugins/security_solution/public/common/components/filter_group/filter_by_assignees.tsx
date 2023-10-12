/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash/fp';
import type { FC } from 'react';
import React, { memo, useCallback, useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import { UserProfilesPopover } from '@kbn/user-profile-components';

import { EuiFilterButton } from '@elastic/eui';
import { useSuggestUsers } from '../../../detections/containers/detection_engine/alerts/use_suggest_users';
import { TEST_IDS } from './constants';

export interface FilterByAssigneesPopoverProps {
  /**
   * Ids of the users assigned to the alert
   */
  existingAssigneesIds: string[];

  /**
   * Callback to handle changing of the assignees selection
   */
  onUsersChange: (users: string[]) => void;
}

/**
 * The popover to filter alerts by assigned users
 */
export const FilterByAssigneesPopover: FC<FilterByAssigneesPopoverProps> = memo(
  ({ existingAssigneesIds, onUsersChange }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const { loading: isLoadingUsers, userProfiles } = useSuggestUsers(searchTerm);

    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const togglePopover = useCallback(() => setIsPopoverOpen((value) => !value), []);

    const [selectedAssignees, setSelectedAssignees] = useState<UserProfileWithAvatar[]>([]);
    useEffect(() => {
      if (isLoadingUsers) {
        return;
      }
      const assignees = userProfiles.filter((user) => existingAssigneesIds.includes(user.uid));
      setSelectedAssignees(assignees);
    }, [existingAssigneesIds, isLoadingUsers, userProfiles]);

    const handleSelectedAssignees = useCallback(
      (newAssignees: UserProfileWithAvatar[]) => {
        if (!isEqual(newAssignees, selectedAssignees)) {
          setSelectedAssignees(newAssignees);
          onUsersChange(newAssignees.map((user) => user.uid));
        }
      },
      [onUsersChange, selectedAssignees]
    );

    const selectedStatusMessage = useCallback(
      (total: number) =>
        i18n.translate(
          'xpack.securitySolution.flyout.right.visualizations.assignees.totalUsersAssigned',
          {
            defaultMessage: '{total, plural, one {# filter} other {# filters}} selected',
            values: { total },
          }
        ),
      []
    );

    return (
      <UserProfilesPopover
        title={i18n.translate(
          'xpack.securitySolution.flyout.right.visualizations.assignees.popoverTitle',
          {
            defaultMessage: 'Assignees',
          }
        )}
        button={
          <EuiFilterButton
            data-test-subj={TEST_IDS.FILTER_BY_ASSIGNEES_BUTTON}
            iconType="arrowDown"
            onClick={togglePopover}
            isLoading={isLoadingUsers}
            isSelected={isPopoverOpen}
            hasActiveFilters={selectedAssignees.length > 0}
            numActiveFilters={selectedAssignees.length}
          >
            {i18n.translate('xpack.securitySolution.filtersGroup.assignees.buttonTitle', {
              defaultMessage: 'Assignees',
            })}
          </EuiFilterButton>
        }
        isOpen={isPopoverOpen}
        closePopover={togglePopover}
        panelStyle={{
          minWidth: 520,
        }}
        selectableProps={{
          onSearchChange: (term: string) => {
            setSearchTerm(term);
          },
          onChange: handleSelectedAssignees,
          selectedStatusMessage,
          options: userProfiles,
          selectedOptions: selectedAssignees,
          isLoading: isLoadingUsers,
          height: 'full',
        }}
      />
    );
  }
);

FilterByAssigneesPopover.displayName = 'FilterByAssigneesPopover';
