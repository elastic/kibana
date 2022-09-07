/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpStart } from '@kbn/core/public';
import { UserProfile } from '@kbn/security-plugin/common';
import { SecurityPluginStart } from '@kbn/security-plugin/public';
import { INTERNAL_SUGGEST_USER_PROFILES_URL, DEFAULT_USER_SIZE } from '../../../common/constants';

export interface SuggestUserProfilesArgs {
  http: HttpStart;
  name: string;
  owner: string[];
  signal: AbortSignal;
  size?: number;
}

export const suggestUserProfiles = async ({
  http,
  name,
  size = DEFAULT_USER_SIZE,
  owner,
  signal,
}: SuggestUserProfilesArgs): Promise<UserProfile[]> => {
  const response = await http.post<UserProfile[]>(INTERNAL_SUGGEST_USER_PROFILES_URL, {
    body: JSON.stringify({ name, size, owner }),
    signal,
  });

  return response;
};

export interface BulkGetUserProfilesArgs {
  security: SecurityPluginStart;
  uids: string[];
}

export const bulkGetUserProfiles = async ({
  security,
  uids,
}: BulkGetUserProfilesArgs): Promise<UserProfile[]> => {
  return security.userProfiles.bulkGet({ uids: new Set(uids), dataPath: 'avatar' });
};
