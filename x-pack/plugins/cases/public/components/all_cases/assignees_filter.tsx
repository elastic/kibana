/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFilterButton, EuiFilterGroup } from '@elastic/eui';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import { UserProfilesPopover } from '@kbn/user-profile-components';
import { isEmpty } from 'lodash';
import React, { useCallback, useMemo, useState } from 'react';
import { useIsUserTyping } from '../../common/use_is_user_typing';
import { useSuggestUserProfiles } from '../../containers/user_profiles/use_suggest_user_profiles';
import { useAvailableCasesOwners } from '../app/use_available_owners';
import { useCasesContext } from '../cases_context/use_cases_context';
import type { CurrentUserProfile } from '../types';
import { EmptyMessage } from '../user_profiles/empty_message';
import { NoMatches } from '../user_profiles/no_matches';
import { bringCurrentUserToFrontAndSort, orderAssigneesIncludingNone } from '../user_profiles/sort';
import type { AssigneesFilteringSelection } from '../user_profiles/types';
import * as i18n from './translations';
import { MAX_ASSIGNEES_FILTER_LENGTH } from '../../../common/constants';

export const NO_ASSIGNEES_VALUE = null;

export interface AssigneesFilterPopoverProps {
  selectedAssignees: Array<string | null>;
  currentUserProfile: CurrentUserProfile;
  isLoading: boolean;
  onSelectionChange: (params: {
    filterId: string;
    selectedOptionKeys: Array<string | null>;
  }) => void;
}

const AssigneesFilterPopoverComponent: React.FC<AssigneesFilterPopoverProps> = ({
  selectedAssignees: selectedAssigneesUids,
  currentUserProfile,
  isLoading,
  onSelectionChange,
}) => {
  const { owner: owners } = useCasesContext();
  const hasOwners = owners.length > 0;
  const availableOwners = useAvailableCasesOwners(['read']);
  const [searchTerm, setSearchTerm] = useState('');
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const { isUserTyping, onContentChange, onDebounce } = useIsUserTyping();

  const togglePopover = useCallback(() => setIsPopoverOpen((value) => !value), []);

  const onChange = useCallback(
    (users: AssigneesFilteringSelection[]) => {
      const sortedUsers = orderAssigneesIncludingNone(currentUserProfile, users);
      onSelectionChange({
        filterId: 'assignees',
        selectedOptionKeys: sortedUsers.map((user) => user?.uid ?? null),
      });
    },
    [currentUserProfile, onSelectionChange]
  );

  const selectedStatusMessage = useCallback(
    (selectedCount: number) => i18n.TOTAL_ASSIGNEES_FILTERED(selectedCount),
    []
  );

  const onSearchChange = useCallback(
    (term: string) => {
      setSearchTerm(term);
      onContentChange(term);
    },
    [onContentChange]
  );

  const { data: userProfiles, isLoading: isLoadingSuggest } = useSuggestUserProfiles({
    name: searchTerm,
    owners: hasOwners ? owners : availableOwners,
    onDebounce,
  });

  const limitReachedMessage = useCallback(
    (limit: number) => i18n.MAX_SELECTED_FILTER(limit, 'assignees'),
    []
  );

  const searchResultProfiles = useMemo(() => {
    const sortedUsers = bringCurrentUserToFrontAndSort(currentUserProfile, userProfiles) ?? [];

    if (isEmpty(searchTerm)) {
      return [null, ...sortedUsers];
    }

    return sortedUsers;
  }, [currentUserProfile, userProfiles, searchTerm]);

  const selectedAssignees = selectedAssigneesUids
    .map((uuid) => {
      // this is the "no assignees" option
      if (uuid === null) return null;
      const userProfile = searchResultProfiles.find((user) => user?.uid === uuid);
      return userProfile;
    })
    .filter(
      (userProfile): userProfile is UserProfileWithAvatar | null => userProfile !== undefined
    ); // Filter out profiles that no longer exists
  const isLoadingData = isLoading || isLoadingSuggest;

  return (
    <EuiFilterGroup>
      <UserProfilesPopover
        isOpen={isPopoverOpen}
        closePopover={togglePopover}
        panelStyle={{
          width: 400,
        }}
        button={
          <EuiFilterButton
            data-test-subj="options-filter-popover-button-assignees"
            iconType="arrowDown"
            onClick={togglePopover}
            isLoading={isLoadingData}
            isSelected={isPopoverOpen}
            hasActiveFilters={selectedAssignees.length > 0}
            numActiveFilters={selectedAssignees.length}
            aria-label={i18n.FILTER_ASSIGNEES_ARIA_LABEL}
          >
            {i18n.ASSIGNEES}
          </EuiFilterButton>
        }
        selectableProps={{
          onChange,
          onSearchChange,
          selectedStatusMessage,
          options: searchResultProfiles,
          selectedOptions: selectedAssignees,
          isLoading: isLoadingData || isUserTyping,
          height: 'full',
          searchPlaceholder: i18n.SEARCH_USERS,
          clearButtonLabel: i18n.CLEAR_FILTERS,
          emptyMessage: <EmptyMessage />,
          noMatchesMessage: !isUserTyping && !isLoadingData ? <NoMatches /> : <EmptyMessage />,
          limit: MAX_ASSIGNEES_FILTER_LENGTH,
          limitReachedMessage,
          singleSelection: false,
          nullOptionLabel: i18n.NO_ASSIGNEES,
        }}
      />
    </EuiFilterGroup>
  );
};
AssigneesFilterPopoverComponent.displayName = 'AssigneesFilterPopover';

export const AssigneesFilterPopover = React.memo(AssigneesFilterPopoverComponent);
