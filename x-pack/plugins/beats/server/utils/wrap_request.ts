/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FrameworkRequest, WrappableRequest } from '../lib/lib';

export const internalFrameworkRequest = Symbol('internalFrameworkRequest');

export function wrapRequest<InternalRequest extends WrappableRequest>(
  req: InternalRequest
): FrameworkRequest<InternalRequest> {
  const { params, payload, query, headers, info } = req;

  return {
    [internalFrameworkRequest]: req,
    headers,
    info,
    params,
    payload,
    query,
  };
}
