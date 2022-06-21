/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthenticatedUserProfile } from './user_profile';

export const userProfileMock = {
  create: (userProfile: Partial<AuthenticatedUserProfile> = {}): AuthenticatedUserProfile => {
    return {
      uid: 'some-profile-uid',
      enabled: true,
      user: {
        username: 'some-username',
        realm_name: 'some-realm',
        roles: [],
        email: 'some@email',
        authentication_provider: { type: 'basic', name: 'basic1' },
        ...userProfile.user,
      },
      data: {},
      labels: {},
      ...userProfile,
    };
  },
};
