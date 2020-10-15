/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AuthenticatedUser } from './authenticated_user';

export function mockAuthenticatedUser(user: Partial<AuthenticatedUser> = {}) {
  return {
    username: 'user',
    email: 'email',
    full_name: 'full name',
    roles: ['user-role'],
    enabled: true,
    authentication_realm: { name: 'native1', type: 'native' },
    lookup_realm: { name: 'native1', type: 'native' },
    authentication_provider: 'basic1',
    authentication_type: 'realm',
    ...user,
  };
}
