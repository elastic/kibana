/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Capabilities } from 'src/core/types';

import type { AuthenticationProvider } from './authentication_provider';
import type { User } from './user';

const REALMS_ELIGIBLE_FOR_PASSWORD_CHANGE = ['reserved', 'native'];

export interface UserRealm {
  name: string;
  type: string;
}

/**
 * Represents the currently authenticated user.
 */
export interface AuthenticatedUser extends User {
  /**
   * The name and type of the Realm that has authenticated the user.
   */
  authentication_realm: UserRealm;

  /**
   * The name and type of the Realm where the user information were retrieved from.
   */
  lookup_realm: UserRealm;

  /**
   * The authentication provider that used to authenticate user.
   */
  authentication_provider: AuthenticationProvider;

  /**
   * The AuthenticationType used by ES to authenticate the user.
   *
   * @example "realm" | "api_key" | "token" | "anonymous" | "internal"
   */
  authentication_type: string;
}

export function isUserAnonymous(user: Pick<AuthenticatedUser, 'authentication_provider'>) {
  return user.authentication_provider.type === 'anonymous';
}

export function canUserChangePassword(
  user: Pick<AuthenticatedUser, 'authentication_realm' | 'authentication_provider'>
) {
  return (
    REALMS_ELIGIBLE_FOR_PASSWORD_CHANGE.includes(user.authentication_realm.type) &&
    !isUserAnonymous(user)
  );
}

export function canUserChangeDetails(
  user: Pick<AuthenticatedUser, 'authentication_realm'>,
  capabilities: Capabilities
) {
  return user.authentication_realm.type === 'native' && capabilities.management.security.users;
}
