/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface User {
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

export function useCurrentUser() {
  return {
    username: 'john_doe',
    email: 'john.doe@example.com',
    full_name: 'John Doe',
    roles: ['user', 'editor'],
    enabled: true,
  };
}
