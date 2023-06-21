/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext } from 'react';

import { Privileges } from '../../../../../common/types/privileges';

import { useRequest } from '../../../hooks';

import {
  TransformCapabilities,
  INITIAL_CAPABILITIES,
} from '../../../../../common/privilege/has_privilege_factory';

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
  const { path, version } = privilegesEndpoint;
  const {
    isLoading,
    error,
    data: privilegesData,
  } = useRequest({
    path,
    version,
    method: 'get',
  });

  const value = {
    isLoading,
    privileges: isLoading ? { ...initialValue.privileges } : privilegesData.privileges,
    capabilities: isLoading ? { ...INITIAL_CAPABILITIES } : privilegesData.capabilities,
    apiError: error ? (error as Error) : null,
  };

  return (
    <AuthorizationContext.Provider value={{ ...value }}>{children}</AuthorizationContext.Provider>
  );
};
