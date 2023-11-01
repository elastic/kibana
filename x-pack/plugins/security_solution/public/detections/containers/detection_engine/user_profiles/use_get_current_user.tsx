/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import { useEffect, useState } from 'react';

import { CURRENT_USER_PROFILE_FAILURE } from './translations';
import { useKibana } from '../../../../common/lib/kibana';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';

interface GetCurrentUserReturn {
  loading: boolean;
  userProfile?: UserProfileWithAvatar;
}

export const useGetCurrentUser = (): GetCurrentUserReturn => {
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserProfileWithAvatar | undefined>(undefined);
  const { addError } = useAppToasts();
  const userProfiles = useKibana().services.security.userProfiles;

  useEffect(() => {
    // isMounted tracks if a component is mounted before changing state
    let isMounted = true;
    setLoading(true);
    const fetchData = async () => {
      try {
        const profile = await userProfiles.getCurrent({ dataPath: 'avatar' });
        if (isMounted) {
          setCurrentUser(profile);
        }
      } catch (error) {
        addError(error.message, { title: CURRENT_USER_PROFILE_FAILURE });
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
  }, [addError, userProfiles]);
  return { loading, userProfile: currentUser };
};
