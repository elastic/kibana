/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';

import type { SecurityPluginStart } from '@kbn/security-plugin/public';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';

import { CURRENT_USER_PROFILE_FAILURE } from './translations';
import { useKibana } from '../../lib/kibana';
import { useAppToasts } from '../../hooks/use_app_toasts';

export const getCurrentUser = async ({
  security,
}: {
  security: SecurityPluginStart;
}): Promise<UserProfileWithAvatar> => {
  return security.userProfiles.getCurrent({ dataPath: 'avatar' });
};

export const useGetCurrentUser = () => {
  const { security } = useKibana().services;
  const { addError } = useAppToasts();

  return useQuery<UserProfileWithAvatar>(
    ['useGetCurrentUser'],
    async () => {
      return getCurrentUser({ security });
    },
    {
      retry: false,
      staleTime: Infinity,
      onError: (e) => {
        addError(e, { title: CURRENT_USER_PROFILE_FAILURE });
      },
    }
  );
};
