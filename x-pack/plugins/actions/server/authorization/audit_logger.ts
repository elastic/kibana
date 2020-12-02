/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LegacyAuditLogger } from '../../../security/server';

export enum AuthorizationResult {
  Unauthorized = 'Unauthorized',
  Authorized = 'Authorized',
}

export class ActionsAuthorizationAuditLogger {
  private readonly auditLogger: LegacyAuditLogger;

  constructor(auditLogger: LegacyAuditLogger = { log() {} }) {
    this.auditLogger = auditLogger;
  }

  public getAuthorizationMessage(
    authorizationResult: AuthorizationResult,
    operation: string,
    actionTypeId?: string
  ): string {
    return `${authorizationResult} to ${operation} ${
      actionTypeId ? `a "${actionTypeId}" action` : `actions`
    }`;
  }

  public actionsAuthorizationFailure(
    username: string,
    operation: string,
    actionTypeId?: string
  ): string {
    const message = this.getAuthorizationMessage(
      AuthorizationResult.Unauthorized,
      operation,
      actionTypeId
    );
    this.auditLogger.log('actions_authorization_failure', `${username} ${message}`, {
      username,
      actionTypeId,
      operation,
    });
    return message;
  }

  public actionsAuthorizationSuccess(
    username: string,
    operation: string,
    actionTypeId?: string
  ): string {
    const message = this.getAuthorizationMessage(
      AuthorizationResult.Authorized,
      operation,
      actionTypeId
    );
    this.auditLogger.log('actions_authorization_success', `${username} ${message}`, {
      username,
      actionTypeId,
      operation,
    });
    return message;
  }
}
