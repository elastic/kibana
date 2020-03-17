/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaRequest } from '../../../../../src/core/server';

export class HTTPAuthorizationHeader {
  constructor(public scheme: string, public credentials: string) {}

  static parseFromRequest(request: KibanaRequest) {
    const authorizationHeaderValue = request.headers.authorization;
    if (!authorizationHeaderValue || typeof authorizationHeaderValue !== 'string') {
      return null;
    }

    const [scheme] = authorizationHeaderValue.split(/\s+/);
    const credentials = authorizationHeaderValue.substring(scheme.length + 1);

    return new HTTPAuthorizationHeader(scheme.toLowerCase(), credentials);
  }
}
