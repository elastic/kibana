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

/**
 * Checks whether authentication provider with the specified type uses Kibana's native login form.
 * @param providerType Type of the authentication provider.
 */
export function shouldProviderUseLoginForm(providerType: string) {
  return providerType === 'basic' || providerType === 'token';
}
