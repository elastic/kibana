/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import { useEffect, useState } from 'react';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { getUserProfiles } from './api';
import { USER_PROFILES_FAILURE } from './translations';

interface GetUserProfilesReturn {
  loading: boolean;
  userProfiles: UserProfileWithAvatar[];
}

export const useGetUserProfiles = (userIds: string[]): GetUserProfilesReturn => {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<UserProfileWithAvatar[]>([]);
  const { addError } = useAppToasts();

  useEffect(() => {
    // isMounted tracks if a component is mounted before changing state
    let isMounted = true;
    setLoading(true);
    const fetchData = async () => {
      try {
        const usersResponse = userIds.length > 0 ? await getUserProfiles({ userIds }) : [];
        if (isMounted) {
          setUsers(usersResponse);
        }
      } catch (error) {
        addError(error.message, { title: USER_PROFILES_FAILURE });
      }
      if (isMounted) {
        setLoading(false);
      }
    };
    fetchData();
    return () => {
      // updates to show component is unmounted
      isMounted = false;
    };
  }, [addError, userIds]);
  return { loading, userProfiles: users };
};
