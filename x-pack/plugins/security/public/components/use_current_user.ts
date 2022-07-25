/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import constate from 'constate';
import useAsync from 'react-use/lib/useAsync';
import useObservable from 'react-use/lib/useObservable';

import { useSecurityApiClients } from '.';
import type { UserProfileData } from '../../common';
import type { AuthenticationServiceSetup } from '../authentication';

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

export function useUserProfile<T extends UserProfileData>(dataPath?: string) {
  const { userProfiles } = useSecurityApiClients();
  const dataUpdateState = useObservable(userProfiles.dataUpdates$);
  return useAsync(
    () => userProfiles.getCurrent<T>(dataPath ? { dataPath } : undefined),
    [userProfiles, dataUpdateState]
  );
}
