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
  metadata?: {
    _reserved: boolean;
  };
}

export interface EditUser extends User {
  password: string;
  confirmPassword: string;
}

export function getUserDisplayName(user: User) {
  return user.full_name || user.username;
}
