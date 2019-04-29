/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  FrameworkRequest,
  internalAuthData,
  KibanaServerRequest,
} from '../lib/adapters/framework/adapter_types';

export function wrapRequest<InternalRequest extends KibanaServerRequest>(
  req: InternalRequest
): FrameworkRequest<InternalRequest> {
  const { params, payload, query, headers, info } = req;

  const isAuthenticated = headers.authorization != null;

  return {
    // @ts-ignore -- partial applucation, adapter adds other user data
    user: isAuthenticated
      ? {
          kind: 'authenticated',
          [internalAuthData]: headers,
        }
      : {
          kind: 'unauthenticated',
        },
    headers,
    info,
    params,
    payload,
    query,
  };
}
