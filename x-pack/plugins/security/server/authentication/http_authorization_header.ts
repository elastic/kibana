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
export function getRequestsHTTPAuthenticationScheme(request: KibanaRequest) {
  const authorizationHeaderValue = request.headers.authorization;
  if (!authorizationHeaderValue || typeof authorizationHeaderValue !== 'string') {
    return null;
  }

  return getHTTPAuthenticationScheme(authorizationHeaderValue);
}

/**
 * Extracts authentication scheme from the value of a `Authorization` HTTP header.
 * https://www.iana.org/assignments/http-authschemes/http-authschemes.xhtml#authschemes
 * @param authorizationHeaderValue Authorization header value to extract authentication scheme for.
 */
export function getHTTPAuthenticationScheme(authorizationHeaderValue: string) {
  return authorizationHeaderValue.split(/\s+/)[0].toLowerCase();
}

/**
 * Returns the `Authorization` HTTP header from a `KibanaRequest`
 * https://www.iana.org/assignments/http-authschemes/http-authschemes.xhtml#authschemes
 * @param request Request instance to return authorization header.
 */
export function getHTTPAuthorizationHeader(request: KibanaRequest) {
  const authorizationHeaderValue = request.headers.authorization;
  if (!authorizationHeaderValue || typeof authorizationHeaderValue !== 'string') {
    return null;
  }

  return authorizationHeaderValue;
}
