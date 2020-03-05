/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaRequest } from '../../../../../src/core/server';

/**
 * Parses request's `Authorization` HTTP header if present and extracts authentication scheme.
 * https://www.iana.org/assignments/http-authschemes/http-authschemes.xhtml#authschemes
 * @param request Request instance to extract authentication scheme for.
 */
export function getHTTPAuthenticationScheme(request: KibanaRequest) {
  const authorizationHeaderValue = request.headers.authorization;
  if (!authorizationHeaderValue || typeof authorizationHeaderValue !== 'string') {
    return null;
  }

  return authorizationHeaderValue.split(/\s+/)[0].toLowerCase();
}
