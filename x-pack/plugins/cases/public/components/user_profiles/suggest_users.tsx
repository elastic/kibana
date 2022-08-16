/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { UserProfilesSelectable, UserProfileWithAvatar } from '@kbn/user-profile-components';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiText,
  useEuiPaddingSize,
} from '@elastic/eui';
import { useSuggestUserProfiles } from '../../containers/user_profiles/use_suggest_user_profiles';
import { useCasesContext } from '../cases_context/use_cases_context';
import { AssigneeWithProfile } from './types';
import * as i18n from './translations';

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
    () => selectedUsers.map((assignee) => ({ ...assignee.profile })),
    [selectedUsers]
  );

  const [currentSelectedUsers, setCurrentSelectedUsers] =
    useState<UserProfileWithAvatar[]>(selectedProfiles);

  const onChange = useCallback(
    (users: UserProfileWithAvatar[]) => {
      setCurrentSelectedUsers(users);
      onUsersChange(users);
    },
    [onUsersChange]
  );

  const { data: userProfiles, isLoading: isLoadingSuggest } = useSuggestUserProfiles({
    name: searchTerm,
    owners: owner,
  });

  const defaultOptions = currentUserProfile ? [currentUserProfile] : [];

  return (
    <EuiFlexGroup
      direction="column"
      justifyContent="spaceBetween"
      gutterSize="xs"
      responsive={false}
    >
      <EuiFlexItem grow={false}>
        <EuiText
          size="s"
          css={`
            padding: ${useEuiPaddingSize('xs')};
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
          options={userProfiles}
          selectedOptions={currentSelectedUsers}
          defaultOptions={defaultOptions}
          isLoading={isLoadingSuggest || isLoading}
          height="full"
          searchPlaceholder={i18n.SEARCH_USERS}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

SuggestUsersComponent.displayName = 'SuggestUsers';

export const SuggestUsers = React.memo(SuggestUsersComponent);
