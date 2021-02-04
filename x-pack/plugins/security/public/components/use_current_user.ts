/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import useAsync from 'react-use/lib/useAsync';
import constate from 'constate';
import { AuthenticationServiceSetup } from '../authentication';

export interface AuthenticationProviderProps {
  authc: AuthenticationServiceSetup;
}

const [AuthenticationProvider, useAuthentication] = constate(
  ({ authc }: AuthenticationProviderProps) => authc
);

export { AuthenticationProvider, useAuthentication };

export function useCurrentUser() {
  const authc = useAuthentication();
  return useAsync(authc.getCurrentUser, [authc]);
}
