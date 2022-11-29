/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Request } from '@hapi/hapi';
import { CoreKibanaRequest } from '@kbn/core/server';

export function getFakeKibanaRequest(apiKey: { id: string; api_key: string }) {
  const requestHeaders: Record<string, string> = {};

  requestHeaders.authorization = `ApiKey ${Buffer.from(`${apiKey.id}:${apiKey.api_key}`).toString(
    'base64'
  )}`;

  return CoreKibanaRequest.from({
    headers: requestHeaders,
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
  } as unknown as Request);
}
