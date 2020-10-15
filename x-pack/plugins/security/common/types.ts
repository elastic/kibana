/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * Type and name tuple to identify provider used to authenticate user.
 */
export interface AuthenticationProvider {
  type: string;
  name: string;
}

export interface SessionInfo {
  now: number;
  idleTimeoutExpiration: number | null;
  lifespanExpiration: number | null;
  provider: AuthenticationProvider;
}
