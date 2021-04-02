/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest } from 'kibana/server';

export function getAuthorizationHeader(request: KibanaRequest) {
  return request.headers.authorization === undefined
    ? {}
    : {
        headers: { 'es-secondary-authorization': request.headers.authorization },
      };
}
