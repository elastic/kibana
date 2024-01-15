/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash/fp';
import type { FC } from 'react';
import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';

import { EuiButton } from '@elastic/eui';
import { UserProfilesSelectable } from '@kbn/user-profile-components';

import { isEmpty } from 'lodash';
import { useGetCurrentUserProfile } from '../user_profiles/use_get_current_user_profile';
import * as i18n from './translations';
import type { AssigneesIdsSelection, AssigneesProfilesSelection } from './types';
import { NO_ASSIGNEES_VALUE } from './constants';
import { useSuggestUsers } from '../user_profiles/use_suggest_users';
import { useBulkGetUserProfiles } from '../user_profiles/use_bulk_get_user_profiles';
import { bringCurrentUserToFrontAndSort, removeNoAssigneesSelection } from './utils';
import { ASSIGNEES_APPLY_BUTTON_TEST_ID, ASSIGNEES_APPLY_PANEL_TEST_ID } from './test_ids';

export interface AssigneesApplyPanelProps {
  /**
   * Identifier of search field.
   */
  searchInputId?: string;

  /**
   * Ids of the users assigned to the alert
   */
  assignedUserIds: AssigneesIdsSelection[];

  /**
   * Show "Unassigned" option if needed
   */
  showUnassignedOption?: boolean;

  /**
   * Callback to handle changing of the assignees selection
   */
  onSelectionChange?: (users: AssigneesIdsSelection[]) => void;

  /**
   * Callback to handle applying assignees. If provided will show "Apply assignees" button
   */
  onAssigneesApply?: (selectedAssignees: AssigneesIdsSelection[]) => void;
}

/**
 * The popover to allow selection of users from a list
 */
export const AssigneesApplyPanel: FC<AssigneesApplyPanelProps> = memo(
  ({
    searchInputId,
    assignedUserIds,
    showUnassignedOption,
    onSelectionChange,
    onAssigneesApply,
  }) => {
    const { data: currentUserProfile } = useGetCurrentUserProfile();
    const existingIds = useMemo(
      () => new Set(removeNoAssigneesSelection(assignedUserIds)),
      [assignedUserIds]
    );
    const { isLoading: isLoadingAssignedUsers, data: assignedUsers } = useBulkGetUserProfiles({
      uids: existingIds,
    });

    const [searchTerm, setSearchTerm] = useState('');
    const { isLoading: isLoadingSuggestedUsers, data: userProfiles } = useSuggestUsers({
      searchTerm,
    });

    const searchResultProfiles = useMemo(() => {
      const sortedUsers = bringCurrentUserToFrontAndSort(currentUserProfile, userProfiles) ?? [];

      if (showUnassignedOption && isEmpty(searchTerm)) {
        return [NO_ASSIGNEES_VALUE, ...sortedUsers];
      }

      return sortedUsers;
    }, [currentUserProfile, searchTerm, showUnassignedOption, userProfiles]);

    const [selectedAssignees, setSelectedAssignees] = useState<AssigneesProfilesSelection[]>([]);
    useEffect(() => {
      if (isLoadingAssignedUsers || !assignedUsers) {
        return;
      }
      const hasNoAssigneesSelection = assignedUserIds.find((uid) => uid === NO_ASSIGNEES_VALUE);
      const newAssignees =
        hasNoAssigneesSelection !== undefined
          ? [NO_ASSIGNEES_VALUE, ...assignedUsers]
          : assignedUsers;
      setSelectedAssignees(newAssignees);
    }, [assignedUserIds, assignedUsers, isLoadingAssignedUsers]);

    const handleSelectedAssignees = useCallback(
      (newAssignees: AssigneesProfilesSelection[]) => {
        if (!isEqual(newAssignees, selectedAssignees)) {
          setSelectedAssignees(newAssignees);
          onSelectionChange?.(newAssignees.map((assignee) => assignee?.uid ?? NO_ASSIGNEES_VALUE));
        }
      },
      [onSelectionChange, selectedAssignees]
    );

    const handleApplyButtonClick = useCallback(() => {
      const selectedIds = selectedAssignees.map((assignee) => assignee?.uid ?? NO_ASSIGNEES_VALUE);
      onAssigneesApply?.(selectedIds);
    }, [onAssigneesApply, selectedAssignees]);

    const selectedStatusMessage = useCallback(
      (total: number) => i18n.ASSIGNEES_SELECTION_STATUS_MESSAGE(total),
      []
    );

    const isLoading = isLoadingAssignedUsers || isLoadingSuggestedUsers;

    return (
      <div data-test-subj={ASSIGNEES_APPLY_PANEL_TEST_ID}>
        <UserProfilesSelectable
          searchInputId={searchInputId}
          onSearchChange={(term: string) => {
            setSearchTerm(term);
          }}
          onChange={handleSelectedAssignees}
          selectedStatusMessage={selectedStatusMessage}
          options={searchResultProfiles}
          selectedOptions={selectedAssignees}
          isLoading={isLoading}
          height={'full'}
          singleSelection={false}
          searchPlaceholder={i18n.ASSIGNEES_SEARCH_USERS}
          clearButtonLabel={i18n.ASSIGNEES_CLEAR_FILTERS}
          nullOptionLabel={i18n.ASSIGNEES_NO_ASSIGNEES}
        />
        {onAssigneesApply && (
          <EuiButton
            data-test-subj={ASSIGNEES_APPLY_BUTTON_TEST_ID}
            fullWidth
            size="s"
            onClick={handleApplyButtonClick}
            isDisabled={isLoading}
          >
            {i18n.ASSIGNEES_APPLY_BUTTON}
          </EuiButton>
        )}
      </div>
    );
  }
);

AssigneesApplyPanel.displayName = 'AssigneesPanel';
