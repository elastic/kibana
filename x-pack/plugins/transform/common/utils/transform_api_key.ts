/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GrantAPIKeyResult } from '@kbn/security-plugin/server';
import type { SecurityCreateApiKeyResponse } from '@elastic/elasticsearch/lib/api/types';
import { isPopulatedObject } from '@kbn/ml-is-populated-object';

export interface TransformAPIKey extends GrantAPIKeyResult {
  /**
   * Generated encoded API key used for headers
   */
  encoded: string;
}

export interface SecondaryAuthorizationHeader {
  headers?: { 'es-secondary-authorization': string | string[] };
}

export function isTransformApiKey(arg: any): arg is TransformAPIKey {
  return isPopulatedObject(arg, ['api_key', 'encoded']) && typeof arg.encoded === 'string';
}

export function generateTransformSecondaryAuthHeaders(
  apiKeyWithCurrentUserPermission:
    | GrantAPIKeyResult
    | null
    | undefined
    | SecurityCreateApiKeyResponse
): SecondaryAuthorizationHeader | undefined {
  return isTransformApiKey(apiKeyWithCurrentUserPermission)
    ? {
        headers: {
          'es-secondary-authorization': `ApiKey ${apiKeyWithCurrentUserPermission.encoded}`,
        },
      }
    : undefined;
}
