/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext } from 'react';
import { useQuery } from '@tanstack/react-query';

import type { IHttpFetchError } from '@kbn/core-http-browser';

import { TRANSFORM_REACT_QUERY_KEYS } from '../../../../../common/constants';
import type { Privileges } from '../../../../../common/types/privileges';

import {
  type PrivilegesAndCapabilities,
  type TransformCapabilities,
  INITIAL_CAPABILITIES,
} from '../../../../../common/privilege/has_privilege_factory';

import { useAppDependencies } from '../../../app_dependencies';

interface Authorization {
  isLoading: boolean;
  apiError: Error | null;
  privileges: Privileges;
  capabilities: TransformCapabilities;
}

const initialValue: Authorization = {
  isLoading: true,
  apiError: null,
  privileges: {
    hasAllPrivileges: false,
    missingPrivileges: {},
  },
  capabilities: INITIAL_CAPABILITIES,
};

export const AuthorizationContext = createContext<Authorization>({ ...initialValue });

interface Props {
  privilegesEndpoint: { path: string; version: string };
  children: React.ReactNode;
}

export const AuthorizationProvider = ({ privilegesEndpoint, children }: Props) => {
  const { http } = useAppDependencies();

  const { path, version } = privilegesEndpoint;

  const {
    isLoading,
    error,
    data: privilegesData,
  } = useQuery<PrivilegesAndCapabilities, IHttpFetchError>(
    [TRANSFORM_REACT_QUERY_KEYS.PRIVILEGES],
    async ({ signal }) => {
      return await http.fetch<PrivilegesAndCapabilities>(path, {
        version,
        method: 'GET',
        signal,
      });
    }
  );

  const value = {
    isLoading,
    privileges:
      isLoading || privilegesData === undefined
        ? { ...initialValue.privileges }
        : privilegesData.privileges,
    capabilities:
      isLoading || privilegesData === undefined
        ? { ...INITIAL_CAPABILITIES }
        : privilegesData.capabilities,
    apiError: error ? error : null,
  };

  return (
    <AuthorizationContext.Provider value={{ ...value }}>{children}</AuthorizationContext.Provider>
  );
};
