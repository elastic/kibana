/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { User } from './user';

const REALMS_ELIGIBLE_FOR_PASSWORD_CHANGE = ['reserved', 'native'];

interface UserRealm {
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
}

export function canUserChangePassword(user: AuthenticatedUser) {
  return REALMS_ELIGIBLE_FOR_PASSWORD_CHANGE.includes(user.authentication_realm.type);
}
