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
