/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface User {
  username: string;
  email: string;
  full_name: string;
  roles: string[];
  enabled: boolean;
  authentication_realm?: {
    name: string;
    type: string;
  };
  lookup_realm?: {
    name: string;
    type: string;
  };
}

const REALMS_ELIGIBLE_FOR_PASSWORD_CHANGE = ['reserved', 'native'];

export function getUserDisplayName(user: User): string {
  return user.full_name || user.username;
}

export function canUserChangePassword(user: User): boolean {
  const { authentication_realm: authenticationRealm } = user;

  if (!authenticationRealm) {
    return true;
  }

  return REALMS_ELIGIBLE_FOR_PASSWORD_CHANGE.includes(authenticationRealm.type);
}
