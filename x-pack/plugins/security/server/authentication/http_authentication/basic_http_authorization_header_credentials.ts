/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export class BasicHTTPAuthorizationHeaderCredentials {
  constructor(public username: string, public password: string) {}

  static parseFromCredentials(credentials: string) {
    const decoded = Buffer.from(credentials, 'base64').toString();
    if (decoded.indexOf(':') === -1) {
      throw new Error('Unable to parse basic authentication credentials without a colon');
    }

    const [username] = decoded.split(':');
    // according to https://tools.ietf.org/html/rfc7617, everything
    // after the first colon is considered to be part of the password
    const password = decoded.substring(username.length + 1);
    return new BasicHTTPAuthorizationHeaderCredentials(username, password);
  }
}
