/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UserProfile, UserProfileWithSecurity } from './user_profile';

function createUserProfileMock(userProfile: Partial<UserProfile> = {}) {
  return {
    uid: 'some-profile-uid',
    enabled: true,
    user: {
      username: 'some-username',
      email: 'some@email',
      ...userProfile.user,
    },
    data: {},
    ...userProfile,
  };
}

export const userProfileMock = {
  create: createUserProfileMock,

  createWithSecurity: (
    userProfileWithSecurity: Partial<UserProfileWithSecurity> = {}
  ): UserProfileWithSecurity => {
    const userProfile = createUserProfileMock(userProfileWithSecurity);
    return {
      labels: {},
      ...userProfile,
      user: {
        realm_domain: 'some-realm-domain',
        realm_name: 'some-realm',
        roles: [],
        ...userProfile.user,
      },
    };
  },
};
