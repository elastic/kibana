/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * A set of fields describing Kibana user.
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

/**
 * Set of available name-related fields to pick as display name.
 */
export interface GetUserDisplayNameParams {
  /**
   * Username of the user.
   */
  username: string;

  /**
   * Optional email of the user.
   */
  email?: string;

  /**
   * Optional full name of the user.
   */
  full_name?: string;
}

/**
 * Determines the display name for the provided user information.
 * @param params Set of available user's name-related fields.
 */
export function getUserDisplayName(params: GetUserDisplayNameParams) {
  return params.full_name || params.email || params.username;
}
