/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export class SpacesAuditLogger {
  private readonly enabled: boolean;
  private readonly auditLogger: any;

  constructor(config: any, auditLogger: any) {
    this.enabled =
      config.get('xpack.security.enabled') && config.get('xpack.security.audit.enabled');
    this.auditLogger = auditLogger;
  }
  public spacesAuthorizationFailure(username: string, action: string, spaceIds?: string[]) {
    if (!this.enabled) {
      return;
    }

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
    if (!this.enabled) {
      return;
    }

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
