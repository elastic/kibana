/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UserProfile } from './user_profile';

export const userProfileMock = {
  create: (userProfile: Partial<UserProfile> = {}): UserProfile => ({
    uid: 'some-profile-uid',
    enabled: true,
    user: { username: 'some-username', active: true, roles: [], enabled: true },
    data: {},
    ...userProfile,
  }),
};
