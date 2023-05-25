/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest } from '@kbn/core-http-server';
import { HTTPAuthorizationHeader } from '@kbn/security-plugin/server';

export const getAuthenticationAPIKey = (request: KibanaRequest) => {
  const authorizationHeader = HTTPAuthorizationHeader.parseFromRequest(request);
  if (authorizationHeader && authorizationHeader.credentials) {
    const apiKey = Buffer.from(authorizationHeader.credentials, 'base64')
      .toString()
      .split(':');
    return {
      apiKeyId: apiKey[0],
      apiKey: apiKey[1],
    };
  }
  throw new Error('Authorization header is missing');
};
