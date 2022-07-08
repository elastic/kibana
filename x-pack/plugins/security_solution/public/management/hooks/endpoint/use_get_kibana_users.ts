/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseQueryOptions, UseQueryResult } from 'react-query';
import { useQuery } from 'react-query';
import type { HttpFetchError } from '@kbn/core/public';
import { useHttp } from '../../../common/lib/kibana';

type UsersInfo = Array<{
  enabled: boolean;
  metadata: {
    _reserved: boolean;
    _deprecated: boolean;
  };
  roles: string[];
  username: string;
}>;

const INTERNAL_USERS_ROUTE = '/internal/security/users';
/**
 * Get all kibana users
 * @param options
 */
export const useGetKibanaUsers = (
  options: UseQueryOptions<UsersInfo, HttpFetchError> = {}
): UseQueryResult<UsersInfo, HttpFetchError> => {
  const http = useHttp();

  return useQuery<UsersInfo, HttpFetchError>({
    queryKey: ['get-kibana-users'],
    ...options,
    queryFn: async () => {
      const users = await http.get<UsersInfo>(INTERNAL_USERS_ROUTE);
      // pick only superusers and non-reserved users
      const filteredUsers = users?.filter(
        (user) =>
          (!user.roles.includes('system_indices_superuser') && !user.metadata._reserved) ||
          user.roles.includes('superuser')
      );
      return filteredUsers;
    },
  });
};
