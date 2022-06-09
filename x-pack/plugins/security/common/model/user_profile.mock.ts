/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockAuthenticatedUser } from './authenticated_user.mock';
import type { AuthenticatedUserProfile } from './user_profile';

export const userProfileMock = {
  create: (userProfile: Partial<AuthenticatedUserProfile> = {}): AuthenticatedUserProfile => {
    const user = mockAuthenticatedUser({
      username: 'some-username',
      roles: [],
      enabled: true,
    });
    return {
      uid: 'some-profile-uid',
      enabled: true,
      user: {
        ...user,
        active: true,
      },
      data: {},
      ...userProfile,
    };
  },
};
