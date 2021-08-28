/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { KibanaRequest } from '../../../../../../src/core/server/http/router/request';

export * from './enrollment_api_key';
export { invalidateAPIKeys } from './security';

export function parseApiKeyFromHeaders(headers: KibanaRequest['headers']) {
  const authorizationHeader = headers.authorization;

  if (!authorizationHeader) {
    throw new Error('Authorization header must be set');
  }

  if (Array.isArray(authorizationHeader)) {
    throw new Error('Authorization header must be `string` not `string[]`');
  }

  if (!authorizationHeader.startsWith('ApiKey ')) {
    throw new Error('Authorization header is malformed');
  }

  const apiKey = authorizationHeader.split(' ')[1];

  return parseApiKey(apiKey);
}

export function parseApiKey(apiKey: string) {
  const apiKeyId = Buffer.from(apiKey, 'base64').toString('utf8').split(':')[0];

  return {
    apiKey,
    apiKeyId,
  };
}
