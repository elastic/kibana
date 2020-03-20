/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { createContext } from 'react';
import { useRequest } from '../../../services/http/use_request';
import { Privileges } from '../../../../../common/types';
import { Error } from '../../../components/section_error';

interface Authorization {
  isLoading: boolean;
  apiError: Error | null;
  privileges: Privileges;
}

const initialValue: Authorization = {
  isLoading: true,
  apiError: null,
  privileges: {
    hasAllPrivileges: true,
    missingPrivileges: {},
  },
};

export const AuthorizationContext = createContext<Authorization>(initialValue);

interface Props {
  privilegesEndpoint: string;
  children: React.ReactNode;
}

export const AuthorizationProvider = ({ privilegesEndpoint, children }: Props) => {
  const { isLoading, error, data: privilegesData } = useRequest({
    path: privilegesEndpoint,
    method: 'get',
  });

  const value = {
    isLoading,
    privileges: isLoading ? { hasAllPrivileges: true, missingPrivileges: {} } : privilegesData,
    apiError: error ? error : null,
  } as Authorization;

  return <AuthorizationContext.Provider value={value}>{children}</AuthorizationContext.Provider>;
};
