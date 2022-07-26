/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UserProfile } from '@kbn/security-plugin/common';
import { SuggestUserProfilesRequest } from '../../../common/api';
import { createCaseError } from '../../common/error';
import { CasesClientArgs } from '../types';

export interface UserProfilesSubClient {
  suggestUserProfiles(params: SuggestUserProfilesRequest): Promise<UserProfile[]>;
}

export const createUserProfilesSubClient = (clientArgs: CasesClientArgs): UserProfilesSubClient => {
  const subClient: UserProfilesSubClient = {
    suggestUserProfiles: (params: SuggestUserProfilesRequest) =>
      suggestUserProfiles(params, clientArgs),
  };

  return Object.freeze(subClient);
};

const suggestUserProfiles = async (
  params: SuggestUserProfilesRequest,
  clientArgs: CasesClientArgs
): Promise<UserProfile[]> => {
  const {
    logger,
    services: { userProfileService },
  } = clientArgs;

  try {
    return userProfileService.suggest(params);
  } catch (error) {
    throw createCaseError({
      logger,
      message: `Failed to retrieve suggested user profiles for name: ${params.name}`,
      error,
    });
  }
};
