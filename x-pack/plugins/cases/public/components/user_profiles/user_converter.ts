/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import { isEmpty } from 'lodash';
import type { ElasticUser } from '../../containers/types';
import type { UserInfoWithAvatar } from './types';

export const convertToUserInfo = (
  user: ElasticUser,
  userProfiles?: Map<string, UserProfileWithAvatar>
): { key: string; userInfo: UserInfoWithAvatar } | undefined => {
  const username = user.username;

  if (user.profileUid != null) {
    const profile = userProfiles?.get(user.profileUid);

    if (profile != null) {
      return { key: profile.uid, userInfo: profile };
    } else if (isValidString(username)) {
      // we couldn't find a valid profile so let's try the username
      return createWithUsername(username, user);
    } else {
      // didn't the username wasn't valid so we'll show an unknown user
      return { key: user.profileUid, userInfo: {} };
    }
  } else if (isValidString(username)) {
    return createWithUsername(username, user);
  }
};

const isValidString = (value?: string | null): value is string => !isEmpty(value);

const createWithUsername = (username: string, user: ElasticUser) => {
  return {
    key: username,
    userInfo: {
      user: { username, full_name: user.fullName ?? undefined, email: user.email ?? undefined },
    },
  };
};
