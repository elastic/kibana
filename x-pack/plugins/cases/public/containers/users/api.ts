/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UserProfile } from '@kbn/security-plugin/common';
import { INTERNAL_SUGGEST_USER_PROFILES_URL, DEFAULT_USER_SIZE } from '../../../common/constants';
import { KibanaServices } from '../../common/lib/kibana';

export interface SuggestUserProfilesArgs {
  name: string;
  owner: string[];
  signal: AbortSignal;
  size?: number;
}

export const suggestUserProfiles = async ({
  name,
  size = DEFAULT_USER_SIZE,
  owner,
  signal,
}: SuggestUserProfilesArgs): Promise<UserProfile[]> => {
  const response = await KibanaServices.get().http.post<UserProfile[]>(
    INTERNAL_SUGGEST_USER_PROFILES_URL,
    { body: JSON.stringify({ name, size, owner }), signal }
  );

  return response;
};
