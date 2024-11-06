/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';

import type { UserProfileWithAvatar } from '@kbn/user-profile-components';

import { suggestUsers } from './api';
import { USER_PROFILES_FAILURE } from './translations';
import { useAppToasts } from '../../hooks/use_app_toasts';

export interface SuggestUserProfilesArgs {
  searchTerm: string;
}

export const bulkGetUserProfiles = async ({
  searchTerm,
}: {
  searchTerm: string;
}): Promise<UserProfileWithAvatar[]> => {
  return suggestUsers({ searchTerm });
};

export const useSuggestUsers = ({ searchTerm }: { searchTerm: string }) => {
  const { addError } = useAppToasts();

  return useQuery<UserProfileWithAvatar[]>(
    ['useSuggestUsers', searchTerm],
    async () => {
      return bulkGetUserProfiles({ searchTerm });
    },
    {
      retry: false,
      staleTime: Infinity,
      onError: (e) => {
        addError(e, { title: USER_PROFILES_FAILURE });
      },
    }
  );
};
