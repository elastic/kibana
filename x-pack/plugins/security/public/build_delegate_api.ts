/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSecurityContract } from '@kbn/core-security-browser';
import type { CoreUserProfileDelegateContract } from '@kbn/core-user-profile-browser';
import type {
  AuthenticationServiceSetup,
  UserProfileAPIClient,
} from '@kbn/security-plugin-types-public';

export const buildSecurityApi = ({
  authc,
}: {
  authc: AuthenticationServiceSetup;
}): CoreSecurityContract => {
  return {
    authc: {
      getCurrentUser: () => authc.getCurrentUser(),
    },
  };
};

export const buildUserProfileApi = ({
  userProfile,
}: {
  userProfile: UserProfileAPIClient;
}): CoreUserProfileDelegateContract => {
  return userProfile;
};
