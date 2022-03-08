/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext } from 'react';

import { Privileges } from '../../../../../common/types/privileges';

import { useRequest } from '../../../hooks';

import { hasPrivilegeFactory, Capabilities } from './common';

interface Authorization {
  isLoading: boolean;
  apiError: Error | null;
  privileges: Privileges;
  capabilities: Capabilities;
}

const initialCapabilities: Capabilities = {
  canGetTransform: false,
  canDeleteTransform: false,
  canPreviewTransform: false,
  canCreateTransform: false,
  canStartStopTransform: false,
  canCreateTransformAlerts: false,
  canUseTransformAlerts: false,
  canResetTransform: false,
};

const initialValue: Authorization = {
  isLoading: true,
  apiError: null,
  privileges: {
    hasAllPrivileges: false,
    missingPrivileges: {},
  },
  capabilities: initialCapabilities,
};

export const AuthorizationContext = createContext<Authorization>({ ...initialValue });

interface Props {
  privilegesEndpoint: string;
  children: React.ReactNode;
}

export const AuthorizationProvider = ({ privilegesEndpoint, children }: Props) => {
  const {
    isLoading,
    error,
    data: privilegesData,
  } = useRequest({
    path: privilegesEndpoint,
    method: 'get',
  });

  const value = {
    isLoading,
    privileges: isLoading ? { ...initialValue.privileges } : privilegesData,
    capabilities: { ...initialCapabilities },
    apiError: error ? (error as Error) : null,
  };

  const hasPrivilege = hasPrivilegeFactory(value.privileges);

  value.capabilities.canGetTransform =
    hasPrivilege(['cluster', 'cluster:monitor/transform/get']) &&
    hasPrivilege(['cluster', 'cluster:monitor/transform/stats/get']);

  value.capabilities.canCreateTransform = hasPrivilege(['cluster', 'cluster:admin/transform/put']);

  value.capabilities.canDeleteTransform = hasPrivilege([
    'cluster',
    'cluster:admin/transform/delete',
  ]);

  value.capabilities.canResetTransform = hasPrivilege(['cluster', 'cluster:admin/transform/reset']);

  value.capabilities.canPreviewTransform = hasPrivilege([
    'cluster',
    'cluster:admin/transform/preview',
  ]);

  value.capabilities.canStartStopTransform =
    hasPrivilege(['cluster', 'cluster:admin/transform/start']) &&
    hasPrivilege(['cluster', 'cluster:admin/transform/start_task']) &&
    hasPrivilege(['cluster', 'cluster:admin/transform/stop']);

  value.capabilities.canCreateTransformAlerts = value.capabilities.canCreateTransform;

  value.capabilities.canUseTransformAlerts = value.capabilities.canGetTransform;

  return (
    <AuthorizationContext.Provider value={{ ...value }}>{children}</AuthorizationContext.Provider>
  );
};
