/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaRequest } from 'kibana/server';

export function getAuthorizationHeader(request: KibanaRequest) {
  return {
    headers: { 'es-secondary-authorization': request.headers.authorization },
  };
}
