/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface User {
  username: string;
  email?: string;
  full_name?: string;
  roles: readonly string[];
  enabled: boolean;
  metadata?: {
    _reserved: boolean;
    _deprecated?: boolean;
    _deprecated_reason?: string;
  };
}

export interface EditUser extends User {
  password?: string;
  confirmPassword?: string;
}

export function getUserDisplayName(user: Pick<User, 'username' | 'full_name'>) {
  return user.full_name || user.username;
}
