/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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
    authentication_provider: { type: 'basic', name: 'basic1' },
    authentication_type: 'realm',
    ...user,
  };
}
