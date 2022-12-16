/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Type and name tuple to identify provider used to authenticate user.
 */
export interface AuthenticationProvider {
  /**
   * Type of the Kibana authentication provider.
   */
  type: string;
  /**
   * Name of the Kibana authentication provider (arbitrary string).
   */
  name: string;
}

/**
 * Checks whether authentication provider with the specified type uses Kibana's native login form.
 * @param providerType Type of the authentication provider.
 */
export function shouldProviderUseLoginForm(providerType: string) {
  return providerType === 'basic' || providerType === 'token';
}
