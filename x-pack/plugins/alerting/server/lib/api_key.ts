/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaRequest } from 'kibana/server';
import {
  SecurityPluginSetup,
  GrantAPIKeyResult as SecurityPluginGrantAPIKeyResult,
  InvalidateAPIKeyResult as SecurityPluginInvalidateAPIKeyResult,
  InvalidateAPIKeyParams,
} from '../../../security/server';

export type CreateAPIKeyResult =
  | { apiKeysEnabled: false }
  | { apiKeysEnabled: true; result: SecurityPluginGrantAPIKeyResult };
export type InvalidateAPIKeyResult =
  | { apiKeysEnabled: false }
  | { apiKeysEnabled: true; result: SecurityPluginInvalidateAPIKeyResult };

export const createAPIKey = async (
  request: KibanaRequest,
  securityPluginSetup?: SecurityPluginSetup
): Promise<CreateAPIKeyResult> => {
  if (!securityPluginSetup) {
    return { apiKeysEnabled: false };
  }
  // Create an API key using the new grant API - in this case the Kibana system user is creating the
  // API key for the user, instead of having the user create it themselves, which requires api_key
  // privileges
  const createAPIKeyResult = await securityPluginSetup.authc.grantAPIKeyAsInternalUser(request);
  if (!createAPIKeyResult) {
    return { apiKeysEnabled: false };
  }
  return {
    apiKeysEnabled: true,
    result: createAPIKeyResult,
  };
};

export const invalidateAPIKeyById = async (
  params: InvalidateAPIKeyParams,
  securityPluginSetup?: SecurityPluginSetup
): Promise<InvalidateAPIKeyResult> => {
  if (!securityPluginSetup) {
    return { apiKeysEnabled: false };
  }
  const invalidateAPIKeyResult = await securityPluginSetup.authc.invalidateAPIKeyAsInternalUser(
    params
  );
  // Null when Elasticsearch security is disabled
  if (!invalidateAPIKeyResult) {
    return { apiKeysEnabled: false };
  }
  return {
    apiKeysEnabled: true,
    result: invalidateAPIKeyResult,
  };
};

export const getApiKeyForAlertPermissions = async (
  basePath: string,
  apiKey?: string | null,
  securityPluginSetup?: SecurityPluginSetup
) => {
  if (!apiKey) {
    return null;
  }
  const requestHeaders: Record<string, string> = { authorization: `ApiKey ${apiKey}` };
  const fakeRequest = {
    headers: requestHeaders,
    getBasePath: () => basePath,
    path: '/',
    route: { settings: {} },
    url: {
      href: '/',
    },
    raw: {
      req: {
        url: '/',
      },
    },
  };
  const createResult = await createAPIKey(
    (fakeRequest as unknown) as KibanaRequest,
    securityPluginSetup
  );
  if (createResult.apiKeysEnabled) {
    return Buffer.from(`${createResult.result.id}:${createResult.result.api_key}`).toString(
      'base64'
    );
  }
  return null;
};

export const invalidateAPIKey = async (
  { apiKey }: { apiKey: string | null },
  securityPluginSetup?: SecurityPluginSetup
): Promise<InvalidateAPIKeyResult> => {
  if (!apiKey) {
    return { apiKeysEnabled: false };
  }

  const apiKeyId = Buffer.from(apiKey, 'base64')
    .toString()
    .split(':')[0];
  return await invalidateAPIKeyById({ id: apiKeyId }, securityPluginSetup);
};
