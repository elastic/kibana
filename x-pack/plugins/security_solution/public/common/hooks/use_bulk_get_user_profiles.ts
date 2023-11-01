/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SecurityPluginStart } from '@kbn/security-plugin/public';
import type { UserProfile } from '@kbn/security-plugin/common';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import { useQuery } from '@tanstack/react-query';
import { useKibana } from '../lib/kibana';

export interface BulkGetUserProfilesArgs {
  security: SecurityPluginStart;
  uids: Set<string>;
}

export const bulkGetUserProfiles = async ({
  security,
  uids,
}: BulkGetUserProfilesArgs): Promise<UserProfile[]> => {
  if (uids.size === 0) {
    return [];
  }
  return security.userProfiles.bulkGet({ uids, dataPath: 'avatar' });
};

export const useBulkGetUserProfiles = ({ uids }: { uids: Set<string> }) => {
  const { security } = useKibana().services;

  return useQuery<UserProfileWithAvatar[]>(
    ['useBulkGetUserProfiles', ...uids],
    async () => {
      return bulkGetUserProfiles({ security, uids });
    },
    {
      retry: false,
      staleTime: Infinity,
    }
  );
};
