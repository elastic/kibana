/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export class SecurityAuditLogger {
  constructor(auditLogger) {
    this._auditLogger = auditLogger;
  }

  authenticationFailure(request, username) {
    this._auditLogger.log(
      'authentication_failure',
      `Authentication failed for ${username}`, {
        username
      });
  }

  authenticationSuccess(request, username) {
    this._auditLogger.log(
      'authentication_success',
      `Authentication successful for ${username}`, {
        username
      });
  }
}
