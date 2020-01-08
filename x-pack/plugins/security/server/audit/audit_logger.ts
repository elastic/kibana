/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LegacyAPI } from '../plugin';

export class SecurityAuditLogger {
  constructor(private readonly getAuditLogger: () => LegacyAPI['auditLogger']) {}

  savedObjectsAuthorizationFailure(
    username: string,
    action: string,
    types: string[],
    missing: string[],
    args?: Record<string, unknown>
  ) {
    this.getAuditLogger().log(
      'saved_objects_authorization_failure',
      `${username} unauthorized to ${action} ${types.join(',')}, missing ${missing.join(',')}`,
      {
        username,
        action,
        types,
        missing,
        args,
      }
    );
  }

  savedObjectsAuthorizationSuccess(
    username: string,
    action: string,
    types: string[],
    args?: Record<string, unknown>
  ) {
    this.getAuditLogger().log(
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
