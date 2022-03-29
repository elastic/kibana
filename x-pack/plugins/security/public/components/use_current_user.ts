/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import constate from 'constate';
import useAsync from 'react-use/lib/useAsync';

import type { CoreStart } from 'src/core/public';

import { useKibana } from '../../../../../src/plugins/kibana_react/public';
import type { UserData } from '../../common';
import { UserProfileAPIClient } from '../account_management';
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

export function useUserProfile<T extends UserData>(dataPath?: string) {
  const { services } = useKibana<CoreStart>();
  return useAsync(() => new UserProfileAPIClient(services.http).get<T>(dataPath), [services.http]);
}
