/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash/fp';
import type { FC } from 'react';
import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';

import { UserProfilesSelectable } from '@kbn/user-profile-components';

import { isEmpty } from 'lodash';
import { useGetCurrentUserProfile } from '../user_profiles/use_get_current_user_profile';
import * as i18n from './translations';
import type { AssigneesIdsSelection, AssigneesProfilesSelection } from './types';
import { NO_ASSIGNEES_VALUE } from './constants';
import { useSuggestUsers } from '../user_profiles/use_suggest_users';
import { useBulkGetUserProfiles } from '../user_profiles/use_bulk_get_user_profiles';
import { bringCurrentUserToFrontAndSort, removeNoAssigneesSelection } from './utils';
import { ASSIGNEES_SELECTABLE_TEST_ID } from './test_ids';

export interface AssigneesSelectableProps {
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
  onSelectionChange?: (userIds: AssigneesIdsSelection[]) => void;
}

/**
 * Renders a selectable component given a list of assignees ids
 */
export const AssigneesSelectable: FC<AssigneesSelectableProps> = memo(
  ({ searchInputId, assignedUserIds, showUnassignedOption, onSelectionChange }) => {
    const { data: currentUserProfile } = useGetCurrentUserProfile();
    const existingIds = useMemo(
      () => new Set(removeNoAssigneesSelection(assignedUserIds)),
      [assignedUserIds]
    );
    const { isLoading: isLoadingUserProfiles, data: assignedUserProfiles } = useBulkGetUserProfiles(
      {
        uids: existingIds,
      }
    );

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

    /**
     * Holds user profiles of currently selected users
     */
    const [selectedUserProfiles, setSelectedUserProfiles] = useState<AssigneesProfilesSelection[]>(
      []
    );
    useEffect(() => {
      if (isLoadingUserProfiles || !assignedUserProfiles) {
        return;
      }
      const hasNoAssigneesSelection = assignedUserIds.find((uid) => uid === NO_ASSIGNEES_VALUE);
      const newAssignees =
        hasNoAssigneesSelection !== undefined
          ? [NO_ASSIGNEES_VALUE, ...assignedUserProfiles]
          : assignedUserProfiles;
      setSelectedUserProfiles(newAssignees);
    }, [assignedUserIds, assignedUserProfiles, isLoadingUserProfiles]);

    const handleSelectedAssignees = useCallback(
      (newAssignees: AssigneesProfilesSelection[]) => {
        if (!isEqual(newAssignees, selectedUserProfiles)) {
          setSelectedUserProfiles(newAssignees);
          onSelectionChange?.(newAssignees.map((assignee) => assignee?.uid ?? NO_ASSIGNEES_VALUE));
        }
      },
      [onSelectionChange, selectedUserProfiles]
    );

    const selectedStatusMessage = useCallback(
      (total: number) => i18n.ASSIGNEES_SELECTION_STATUS_MESSAGE(total),
      []
    );

    const isLoading = isLoadingUserProfiles || isLoadingSuggestedUsers;

    return (
      <div data-test-subj={ASSIGNEES_SELECTABLE_TEST_ID}>
        <UserProfilesSelectable
          searchInputId={searchInputId}
          onSearchChange={(term: string) => {
            setSearchTerm(term);
          }}
          onChange={handleSelectedAssignees}
          selectedStatusMessage={selectedStatusMessage}
          options={searchResultProfiles}
          selectedOptions={selectedUserProfiles}
          isLoading={isLoading}
          height={'full'}
          singleSelection={false}
          searchPlaceholder={i18n.ASSIGNEES_SEARCH_USERS}
          clearButtonLabel={i18n.ASSIGNEES_CLEAR_FILTERS}
          nullOptionLabel={i18n.ASSIGNEES_NO_ASSIGNEES}
        />
      </div>
    );
  }
);

AssigneesSelectable.displayName = 'AssigneesSelectable';
