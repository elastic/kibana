/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LoggerFactory, ScopedClusterClient } from '../../../../../src/core/server';

export interface CreateAPIKeyOptions {
  loggers: LoggerFactory;
  callAsCurrentUser: ScopedClusterClient['callAsCurrentUser'];
  isSecurityFeatureDisabled: () => boolean;
  body: {
    name: string;
    role_descriptors: Record<string, any>;
    expiration?: string;
  };
}

/**
 * The return value when creating an API key in Elasticsearch. The API key returned by this API
 * can then be used by sending a request with a Authorization header with a value having the
 * prefix ApiKey `{token}` where token is id and api_key joined by a colon `{id}:{api_key}` and
 * then encoded to base64.
 */
export interface CreateAPIKeyResult {
  /**
   * Unique id for this API key
   */
  id: string;
  /**
   * Name for this API key
   */
  name: string;
  /**
   * Optional expiration in milliseconds for this API key
   */
  expiration?: number;
  /**
   * Generated API key
   */
  api_key: string;
}

export interface InvalidateAPIKeyOptions {
  loggers: LoggerFactory;
  callAsCurrentUser: ScopedClusterClient['callAsCurrentUser'];
  isSecurityFeatureDisabled: () => boolean;
  body: {
    id?: string;
    name?: string;
    realm_name?: string;
    username?: string;
  };
}

/**
 * The return value when invalidating an API key in Elasticsearch.
 */
export interface InvalidateAPIKeyResult {
  /**
   * The IDs of the API keys that were invalidated as part of the request.
   */
  invalidated_api_keys: string[];
  /**
   * The IDs of the API keys that were already invalidated.
   */
  previously_invalidated_api_keys: string[];
  /**
   * The number of errors that were encountered when invalidating the API keys.
   */
  error_count: number;
  /**
   * Details about these errors. This field is not present in the response when error_count is 0.
   */
  error_details?: Array<{
    type: string;
    reason: string;
    caused_by: {
      type: string;
      reason: string;
    };
  }>;
}

export async function createAPIKey({
  body,
  loggers,
  callAsCurrentUser,
  isSecurityFeatureDisabled,
}: CreateAPIKeyOptions): Promise<CreateAPIKeyResult | null> {
  const logger = loggers.get('api-keys');

  if (isSecurityFeatureDisabled()) {
    return null;
  }

  logger.debug('Trying to create an API key');

  // User needs `manage_api_key` privilege to use this API
  const key = (await callAsCurrentUser('shield.createAPIKey', { body })) as CreateAPIKeyResult;

  logger.debug('API key was created successfully');

  return key;
}

export async function invalidateAPIKey({
  body,
  loggers,
  callAsCurrentUser,
  isSecurityFeatureDisabled,
}: InvalidateAPIKeyOptions): Promise<InvalidateAPIKeyResult | null> {
  const logger = loggers.get('api-keys');

  if (isSecurityFeatureDisabled()) {
    return null;
  }

  logger.debug('Trying to invalidate an API key');

  // User needs `manage_api_key` privilege to use this API
  const result = (await callAsCurrentUser('shield.invalidateAPIKey', {
    body,
  })) as InvalidateAPIKeyResult;

  logger.debug('API key was invalidated successfully');

  return result;
}
