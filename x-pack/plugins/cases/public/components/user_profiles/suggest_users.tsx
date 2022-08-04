/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { UserProfilesSelectable } from '@kbn/user-profile-components';

import { useSuggestUserProfiles } from '../../containers/user_profiles/use_suggest_user_profiles';
import { useCasesContext } from '../cases_context/use_cases_context';

const SuggestUsersComponent: React.FC = () => {
  const { owner } = useCasesContext();
  const [searchTerm, setSearchTerm] = useState('');
  const { data: userProfiles, isLoading } = useSuggestUserProfiles({ name: searchTerm, owner });

  return (
    <UserProfilesSelectable
      onChange={() => {}}
      onSearchChange={setSearchTerm}
      options={userProfiles}
      selectedOptions={[]}
      defaultOptions={[]}
      isLoading={isLoading}
    />
  );
};

SuggestUsersComponent.displayName = 'SuggestUsers';

export const SuggestUsers = React.memo(SuggestUsersComponent);
