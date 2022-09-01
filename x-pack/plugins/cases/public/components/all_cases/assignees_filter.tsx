/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFilterButton } from '@elastic/eui';
import { UserProfilesPopover, UserProfileWithAvatar } from '@kbn/user-profile-components';
import React, { useCallback, useEffect, useState } from 'react';
import { CASE_LIST_CACHE_KEY } from '../../containers/constants';
import { useFindAssignees } from '../../containers/use_find_assignees';
import { useAvailableCasesOwners } from '../app/use_available_owners';
import { useCasesContext } from '../cases_context/use_cases_context';
import { CurrentUserProfile } from '../types';
import { EmptyMessage } from '../user_profiles/empty_message';
import { NoMatches } from '../user_profiles/no_matches';
import { SelectedStatusMessage } from '../user_profiles/selected_status_message';
import { bringCurrentUserToFrontAndSort } from '../user_profiles/sort';
import * as i18n from './translations';

export interface AssigneesFilterPopoverProps {
  selectedAssignees: UserProfileWithAvatar[];
  currentUserProfile: CurrentUserProfile;
  isLoading: boolean;
  onSelectionChange: (users: UserProfileWithAvatar[]) => void;
  setFetchAssignees: (fetcher: () => void) => void;
}

const AssigneesFilterPopoverComponent: React.FC<AssigneesFilterPopoverProps> = ({
  selectedAssignees,
  currentUserProfile,
  isLoading,
  onSelectionChange,
  setFetchAssignees,
}) => {
  const { owner: owners } = useCasesContext();
  const hasOwners = owners.length > 0;
  const availableOwners = useAvailableCasesOwners(['read']);
  const [searchTerm, setSearchTerm] = useState('');
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [searchResultProfiles, setSearchResultProfiles] = useState<
    UserProfileWithAvatar[] | undefined
  >();

  const togglePopover = useCallback(() => setIsPopoverOpen((value) => !value), []);

  const onChange = useCallback(
    (users: UserProfileWithAvatar[]) => {
      const sortedUsers = bringCurrentUserToFrontAndSort(currentUserProfile, users);
      onSelectionChange(sortedUsers ?? []);
    },
    [currentUserProfile, onSelectionChange]
  );

  const selectedStatusMessage = useCallback(
    (selectedCount: number) => (
      <SelectedStatusMessage
        selectedCount={selectedCount}
        createMessage={i18n.TOTAL_ASSIGNEES_FILTERED}
      />
    ),
    []
  );

  const {
    data: assignees,
    refetch: fetchAssignees,
    isLoading: isLoadingAssignees,
  } = useFindAssignees({
    owners: hasOwners ? owners : availableOwners,
    searchTerm,
    // TODO: maybe use a different cache key?
    cacheKey: CASE_LIST_CACHE_KEY,
  });

  useEffect(() => {
    const sortedUserProfiles = bringCurrentUserToFrontAndSort(currentUserProfile, assignees);
    setSearchResultProfiles(sortedUserProfiles);
  }, [assignees, currentUserProfile]);

  useEffect(() => {
    if (fetchAssignees != null) {
      setFetchAssignees(fetchAssignees);
    }
  }, [fetchAssignees, setFetchAssignees]);

  const isLoadingData = isLoading || isLoadingAssignees;

  return (
    <UserProfilesPopover
      isOpen={isPopoverOpen}
      closePopover={togglePopover}
      panelStyle={{
        minWidth: 520,
      }}
      button={
        <EuiFilterButton
          data-test-subj="options-filter-popover-button-assignees"
          iconType="arrowDown"
          onClick={togglePopover}
          isLoading={isLoadingData}
          isSelected={isPopoverOpen}
          numFilters={assignees?.length ?? 0}
          hasActiveFilters={selectedAssignees.length > 0}
          numActiveFilters={selectedAssignees.length}
          aria-label={i18n.FILTER_ASSIGNEES_ARIA_LABEL}
        >
          {i18n.ASSIGNEES}
        </EuiFilterButton>
      }
      selectableProps={{
        onChange,
        onSearchChange: setSearchTerm,
        selectedStatusMessage,
        options: searchResultProfiles,
        selectedOptions: selectedAssignees,
        isLoading: isLoadingData,
        height: 'full',
        searchPlaceholder: i18n.SEARCH_USERS,
        clearButtonLabel: i18n.CLEAR_FILTERS,
        emptyMessage: <EmptyMessage />,
        noMatchesMessage: <NoMatches />,
        singleSelection: true,
      }}
    />
  );
};
AssigneesFilterPopoverComponent.displayName = 'AssigneesFilterPopover';

export const AssigneesFilterPopover = React.memo(AssigneesFilterPopoverComponent);
