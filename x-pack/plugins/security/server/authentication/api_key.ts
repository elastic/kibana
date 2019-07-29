/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface CreateApiKeyOptions {
  callCluster: any;
  isSecurityFeatureDisabled: () => boolean;
  body: {
    name: string;
    role_descriptors: Record<string, any>;
    expiration?: string;
  };
}

export interface CreateApiKeyResult {
  id: string;
  name: string;
  expiration?: number;
  api_key: string;
}

export async function createApiKey({
  callCluster,
  body,
  isSecurityFeatureDisabled,
}: CreateApiKeyOptions): Promise<CreateApiKeyResult | null> {
  if (isSecurityFeatureDisabled()) {
    return null;
  }
  return await callCluster('shield.createApiKey', { body });
}
