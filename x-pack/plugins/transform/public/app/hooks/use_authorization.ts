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
import {
  type PrivilegesAndCapabilities,
  INITIAL_CAPABILITIES,
} from '../../../common/privilege/has_privilege_factory';

import { useAppDependencies } from '../app_dependencies';

export const useAuthorization = () => {
  const { http } = useAppDependencies();

  const { error, isLoading, data } = useQuery<PrivilegesAndCapabilities, IHttpFetchError>(
    [TRANSFORM_REACT_QUERY_KEYS.GET_PRIVILEGES],
    ({ signal }) =>
      http.fetch<PrivilegesAndCapabilities>(addInternalBasePath(`privileges`), {
        version: '1',
        method: 'GET',
        signal,
      }),
    {
      initialData: {
        privileges: {
          hasAllPrivileges: false,
          missingPrivileges: {},
        },
        capabilities: INITIAL_CAPABILITIES,
      },
    }
  );

  return useMemo(
    () => ({ error, isLoading, capabilities: data.capabilities, privileges: data.privileges }),
    [error, isLoading, data.capabilities, data.privileges]
  );
};
