/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';

import { GET_USER_PRIVILEGES_ROUTE } from '../../../common/routes';
import type { UserStartPrivilegesResponse } from '../../../common/types';

import { useKibana } from '../use_kibana';

export const useUserPrivilegesQuery = () => {
  const { http } = useKibana().services;
  return useQuery({
    queryKey: ['fetchUserStartPrivileges'],
    queryFn: () => http.get<UserStartPrivilegesResponse>(GET_USER_PRIVILEGES_ROUTE),
  });
};
