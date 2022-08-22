/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { UserProfilesPopover, UserProfileWithAvatar } from '@kbn/user-profile-components';

import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { isEmpty, sortBy } from 'lodash';
import { useSuggestUserProfiles } from '../../../containers/user_profiles/use_suggest_user_profiles';
import { useCasesContext } from '../../cases_context/use_cases_context';
import { AssigneeWithProfile } from '../../user_profiles/types';
import * as i18n from '../translations';
import { getSortField } from '../../user_profiles/sort';

const SelectedStatusMessageComponent: React.FC<{
  searchResultSize: number | undefined;
  defaultOptionsSize: number | undefined;
  selectedCount: number;
}> = ({ searchResultSize, defaultOptionsSize, selectedCount }) => {
  const { euiTheme } = useEuiTheme();
  const totalUsers = useMemo(
    () => defaultOptionsSize ?? searchResultSize ?? 0,
    [defaultOptionsSize, searchResultSize]
  );

  return (
    <EuiFlexGroup gutterSize="none">
      <EuiFlexItem
        grow={false}
        css={{
          paddingRight: euiTheme.size.s,
          borderRight: euiTheme.border.thin,
        }}
      >
        {i18n.TOTAL_USERS(totalUsers)}
      </EuiFlexItem>
      <EuiFlexItem
        css={{
          paddingLeft: euiTheme.size.s,
        }}
        grow={false}
      >
        {i18n.TOTAL_USERS_ASSIGNED(selectedCount)}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
SelectedStatusMessageComponent.displayName = 'SelectedStatusMessage';

const PopoverButton: React.FC<{ togglePopover: () => void; isLoading: boolean }> = ({
  togglePopover,
  isLoading,
}) => (
  <EuiToolTip position="left" content={i18n.EDIT_ASSIGNEES}>
    <EuiButtonIcon
      data-test-subj="case-view-assignees-edit-button"
      aria-label={i18n.EDIT_ASSIGNEES_ARIA_LABEL}
      iconType={'pencil'}
      onClick={togglePopover}
      disabled={isLoading}
    />
  </EuiToolTip>
);
PopoverButton.displayName = 'PopoverButton';

interface SuggestUsersPopoverProps {
  selectedUsers: AssigneeWithProfile[];
  currentUserProfile?: UserProfileWithAvatar;
  isLoading: boolean;
  isPopoverOpen: boolean;
  onUsersChange: (users: UserProfileWithAvatar[]) => void;
  togglePopover: () => void;
  onClosePopover: () => void;
}

const SuggestUsersPopoverComponent: React.FC<SuggestUsersPopoverProps> = ({
  selectedUsers,
  isLoading,
  currentUserProfile,
  isPopoverOpen,
  onUsersChange,
  togglePopover,
  onClosePopover,
}) => {
  const { owner } = useCasesContext();
  const [searchTerm, setSearchTerm] = useState('');

  const selectedProfiles = useMemo(
    () => sortProfiles(selectedUsers.map((assignee) => ({ ...assignee.profile }))),
    [selectedUsers]
  );

  const [currentSelectedUsers, setCurrentSelectedUsers] =
    useState<UserProfileWithAvatar[]>(selectedProfiles);

  const [defaultOptions, setDefaultOptions] = useState<UserProfileWithAvatar[] | undefined>();
  const [searchResultProfiles, setSearchResultProfiles] = useState<
    UserProfileWithAvatar[] | undefined
  >();

  const onChange = useCallback(
    (users: UserProfileWithAvatar[]) => {
      setCurrentSelectedUsers(users);
      onUsersChange(users);
    },
    [onUsersChange]
  );

  const selectedStatusMessage = useCallback(
    (selectedCount: number) => (
      <SelectedStatusMessageComponent
        defaultOptionsSize={defaultOptions?.length}
        searchResultSize={searchResultProfiles?.length}
        selectedCount={selectedCount}
      />
    ),
    [defaultOptions?.length, searchResultProfiles?.length]
  );

  const { data: userProfiles, isLoading: isLoadingSuggest } = useSuggestUserProfiles({
    name: searchTerm,
    owners: owner,
  });

  useEffect(() => {
    const sortedUserProfiles = sortProfiles(userProfiles);

    if (isEmpty(searchTerm)) {
      setDefaultOptions(constructDefaultOptions(sortedUserProfiles, currentUserProfile));
      setSearchResultProfiles(undefined);
    } else {
      setDefaultOptions(undefined);
      setSearchResultProfiles(sortedUserProfiles);
    }
  }, [currentUserProfile, searchTerm, userProfiles]);

  const isLoadingData = isLoadingSuggest || isLoading;

  return (
    <UserProfilesPopover
      title={i18n.EDIT_ASSIGNEES}
      button={<PopoverButton togglePopover={togglePopover} isLoading={isLoadingData} />}
      isOpen={isPopoverOpen}
      closePopover={onClosePopover}
      panelStyle={{
        minWidth: 520,
      }}
      selectableProps={{
        onChange,
        onSearchChange: setSearchTerm,
        selectedStatusMessage,
        options: searchResultProfiles,
        selectedOptions: currentSelectedUsers,
        defaultOptions,
        isLoading: isLoadingData,
        height: 'full',
        searchPlaceholder: i18n.SEARCH_USERS,
        clearButtonLabel: i18n.REMOVE_ASSIGNEES,
      }}
    />
  );
};

SuggestUsersPopoverComponent.displayName = 'SuggestUsersPopover';

export const SuggestUsersPopover = React.memo(SuggestUsersPopoverComponent);

const constructDefaultOptions = (
  profiles?: UserProfileWithAvatar[],
  currentUserProfile?: UserProfileWithAvatar
) => {
  if (!currentUserProfile) {
    return profiles ?? [];
  }

  if (!profiles) {
    return [currentUserProfile];
  }

  const profilesWithoutCurrentUser = profiles.filter(
    (profile) => profile.uid !== currentUserProfile.uid
  );

  return [currentUserProfile, ...profilesWithoutCurrentUser];
};

const sortProfiles = (profiles?: UserProfileWithAvatar[]) => {
  if (!profiles) {
    return [];
  }

  return sortBy(profiles, getSortField);
};
