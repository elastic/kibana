/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { UserProfilesSelectable, UserProfileWithAvatar } from '@kbn/user-profile-components';
import { euiStyled, css } from '@kbn/kibana-react-plugin/common';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiText,
  useEuiPaddingSize,
} from '@elastic/eui';
import { isEmpty, sortBy } from 'lodash';
import { useSuggestUserProfiles } from '../../containers/user_profiles/use_suggest_user_profiles';
import { useCasesContext } from '../cases_context/use_cases_context';
import { AssigneeWithProfile } from './types';
import * as i18n from './translations';
import { getSortField } from './sort';

const FlexItemWithBorder = euiStyled(EuiFlexItem)`
  ${({ theme }) => css`
    & {
      padding-right: ${theme.eui.euiSizeS};
      border-right: ${theme.eui.euiBorderThin};
    }
  `}
`;

const SelectedStatusMessageComponent: React.FC<{
  searchResultSize: number | undefined;
  defaultOptionsSize: number | undefined;
  selectedCount: number;
}> = ({ searchResultSize, defaultOptionsSize, selectedCount }) => {
  const totalUsers = useMemo(
    () => defaultOptionsSize ?? searchResultSize ?? 0,
    [defaultOptionsSize, searchResultSize]
  );

  return (
    <EuiFlexGroup gutterSize="none">
      <FlexItemWithBorder grow={false}>{i18n.TOTAL_USERS(totalUsers)}</FlexItemWithBorder>
      <EuiFlexItem
        css={`
          padding-left: ${useEuiPaddingSize('s')};
        `}
        grow={false}
      >
        {i18n.TOTAL_USERS_ASSIGNED(selectedCount)}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
SelectedStatusMessageComponent.displayName = 'SelectedStatusMessage';

interface SuggestUsersProps {
  selectedUsers: AssigneeWithProfile[];
  isLoading: boolean;
  currentUserProfile?: UserProfileWithAvatar;
  onUsersChange: (users: UserProfileWithAvatar[]) => void;
}

const SuggestUsersComponent: React.FC<SuggestUsersProps> = ({
  selectedUsers,
  isLoading,
  currentUserProfile,
  onUsersChange,
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

  return (
    <EuiFlexGroup
      direction="column"
      justifyContent="spaceBetween"
      gutterSize="none"
      responsive={false}
    >
      <EuiFlexItem grow={false}>
        <EuiText
          size="s"
          css={`
            padding: ${useEuiPaddingSize('s')};
          `}
        >
          <strong>{i18n.EDIT_ASSIGNEES}</strong>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiHorizontalRule margin="none" />
      </EuiFlexItem>
      <EuiFlexItem>
        <UserProfilesSelectable
          onChange={onChange}
          onSearchChange={setSearchTerm}
          selectedStatusMessage={selectedStatusMessage}
          options={searchResultProfiles}
          selectedOptions={currentSelectedUsers}
          defaultOptions={defaultOptions}
          isLoading={isLoadingSuggest || isLoading}
          height="full"
          searchPlaceholder={i18n.SEARCH_USERS}
          clearButtonLabel={i18n.REMOVE_ASSIGNEES}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

SuggestUsersComponent.displayName = 'SuggestUsers';

export const SuggestUsers = React.memo(SuggestUsersComponent);

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
