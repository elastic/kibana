/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UserProfileWithAvatar } from '@kbn/user-profile-components';

import type { SuggestUsersProps } from './types';
import { DETECTION_ENGINE_ALERT_SUGGEST_USERS_URL } from '../../../../common/constants';
import { KibanaServices } from '../../lib/kibana';

/**
 * Fetches suggested user profiles
 */
export const suggestUsers = async ({
  searchTerm,
}: SuggestUsersProps): Promise<UserProfileWithAvatar[]> => {
  return KibanaServices.get().http.fetch<UserProfileWithAvatar[]>(
    DETECTION_ENGINE_ALERT_SUGGEST_USERS_URL,
    {
      method: 'GET',
      version: '2023-10-31',
      query: { searchTerm },
    }
  );
};
