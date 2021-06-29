/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LegacyAuditLogger } from '../audit';

/**
 * @deprecated will be removed in 8.0
 */
export class LegacySpacesAuditLogger {
  private readonly auditLogger: LegacyAuditLogger;

  /**
   * @deprecated will be removed in 8.0
   */
  constructor(auditLogger: LegacyAuditLogger = { log() {} }) {
    this.auditLogger = auditLogger;
  }

  /**
   * @deprecated will be removed in 8.0
   */
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

  /**
   * @deprecated will be removed in 8.0
   */
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
