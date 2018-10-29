/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export class SecurityAuditLogger {
  constructor(config, auditLogger) {
    this._enabled = config.get('xpack.security.audit.enabled');
    this._auditLogger = auditLogger;
  }

  savedObjectsAuthorizationFailure(username, action, types, missing, args) {
    if (!this._enabled) {
      return;
    }

    this._auditLogger.log(
      'saved_objects_authorization_failure',
      `${username} unauthorized to ${action} ${types.join(',')}, missing ${missing.join(',')}`,
      {
        username,
        action,
        types,
        missing,
        args
      }
    );
  }

  savedObjectsAuthorizationSuccess(username, action, types, args) {
    if (!this._enabled) {
      return;
    }

    this._auditLogger.log(
      'saved_objects_authorization_success',
      `${username} authorized to ${action} ${types.join(',')}`,
      {
        username,
        action,
        types,
        args,
      }
    );
  }
}
