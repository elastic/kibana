/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AuditEvent, AuditEventDecorator } from '../../../../../src/core/server';
import { AuthenticationResult } from './authentication_result';

type Args = Required<Pick<AuditEvent['kibana'], 'authentication_provider' | 'authentication_type'>>;

export interface UserEventArgs extends Args {
  authenticationResult: AuthenticationResult;
}

export const userLoginEvent: AuditEventDecorator<UserEventArgs> = (
  event,
  { authenticationResult, authentication_provider, authentication_type } // eslint-disable-line @typescript-eslint/naming-convention
) => ({
  ...event,
  message: authenticationResult.user
    ? `User [${authenticationResult.user.username}] logged in using ${authentication_type} provider [name=${authentication_provider}]`
    : `Failed attemp to login using ${authentication_type} provider [name=${authentication_provider}]`,
  event: {
    action: 'user_login',
    category: 'authentication',
    outcome: authenticationResult.user ? 'success' : 'failure',
  },
  user: authenticationResult.user && {
    name: authenticationResult.user.username,
    roles: authenticationResult.user.roles,
  },
  kibana: {
    ...event.kibana,
    authentication_provider,
    authentication_type,
    authentication_realm: authenticationResult.user?.authentication_realm.name,
    lookup_realm: authenticationResult.user?.lookup_realm.name,
  },
  error: authenticationResult.error && {
    code: authenticationResult.error.name,
    message: authenticationResult.error.message,
  },
});
