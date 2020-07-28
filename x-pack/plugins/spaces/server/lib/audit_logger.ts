/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AuditLogger } from '../../../security/server';

export class SpacesAuditLogger {
  private readonly auditLogger: AuditLogger;

  constructor(auditLogger: AuditLogger = { log() {} }) {
    this.auditLogger = auditLogger;
  }
  public spacesAuthorizationFailure(username: string, action: string, spaceIds?: string[]) {
    this.auditLogger.log(
      'spaces_authorization_failure',
      `${username} unauthorized to ${action}${spaceIds ? ' ' + spaceIds.join(',') : ''} spaces`,
      {
        username,
        action,
        spaceIds,
      }
    );
  }

  public spacesAuthorizationSuccess(username: string, action: string, spaceIds?: string[]) {
    this.auditLogger.log(
      'spaces_authorization_success',
      `${username} authorized to ${action}${spaceIds ? ' ' + spaceIds.join(',') : ''} spaces`,
      {
        username,
        action,
        spaceIds,
      }
    );
  }
}
