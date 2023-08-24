/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import type { IHttpFetchError } from '@kbn/core-http-browser';

import { addInternalBasePath, TRANSFORM_REACT_QUERY_KEYS } from '../../../common/constants';
import type { Privileges } from '../../../common/types/privileges';
import {
  type PrivilegesAndCapabilities,
  type TransformCapabilities,
  INITIAL_CAPABILITIES,
} from '../../../common/privilege/has_privilege_factory';

import { useAppDependencies } from '../app_dependencies';

interface Authorization {
  isLoading: boolean;
  error: Error | null;
  privileges: Privileges;
  capabilities: TransformCapabilities;
}

const initialData: Authorization = {
  isLoading: true,
  error: null,
  privileges: {
    hasAllPrivileges: false,
    missingPrivileges: {},
  },
  capabilities: INITIAL_CAPABILITIES,
};

export const useAuthorization = (): Authorization => {
  const { http } = useAppDependencies();

  const {
    isLoading,
    error,
    data: privilegesData,
  } = useQuery<PrivilegesAndCapabilities, IHttpFetchError>(
    [TRANSFORM_REACT_QUERY_KEYS.GET_PRIVILEGES],
    ({ signal }) =>
      http.fetch<PrivilegesAndCapabilities>(addInternalBasePath(`privileges`), {
        version: '1',
        method: 'GET',
        signal,
      }),
    { initialData }
  );

  return useMemo(
    () => ({
      isLoading,
      privileges: privilegesData.privileges,
      capabilities: privilegesData.capabilities,
      error,
    }),
    [isLoading, privilegesData.privileges, privilegesData.capabilities, error]
  );
};
