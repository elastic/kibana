/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { UserProfilesSelectable, UserProfileWithAvatar } from '@kbn/user-profile-components';

import { useSuggestUserProfiles } from '../../containers/user_profiles/use_suggest_user_profiles';
import { useCasesContext } from '../cases_context/use_cases_context';
import { useGetCurrentUserProfile } from '../../containers/user_profiles/use_get_current_user_profile';

interface SuggestUsersProps {
  selectedUsers: UserProfileWithAvatar[];
  onUsersChange: (users: UserProfileWithAvatar[]) => void;
}

const SuggestUsersComponent: React.FC<SuggestUsersProps> = ({ selectedUsers, onUsersChange }) => {
  const { owner } = useCasesContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentSelectedUsers, setCurrentSelectedUsers] =
    useState<UserProfileWithAvatar[]>(selectedUsers);

  const onChange = useCallback(
    (users: UserProfileWithAvatar[]) => {
      setCurrentSelectedUsers(users);
      onUsersChange(users);
    },
    [onUsersChange]
  );

  const { data: userProfiles, isLoading: isLoadingSuggest } = useSuggestUserProfiles({
    name: searchTerm,
    owner,
  });
  const { data: currentUserProfile, isLoading: isLoadingCurrentUser } = useGetCurrentUserProfile();

  const defaultOptions = currentUserProfile ? [currentUserProfile] : [];

  return (
    <UserProfilesSelectable
      onChange={onChange}
      onSearchChange={setSearchTerm}
      options={userProfiles}
      selectedOptions={currentSelectedUsers}
      defaultOptions={defaultOptions}
      isLoading={isLoadingSuggest || isLoadingCurrentUser}
    />
  );
};

SuggestUsersComponent.displayName = 'SuggestUsers';

export const SuggestUsers = React.memo(SuggestUsersComponent);
