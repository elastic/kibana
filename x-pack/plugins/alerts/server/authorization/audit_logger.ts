/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LegacyAuditLogger } from '../../../security/server';

export enum ScopeType {
  Consumer,
  Producer,
}

export enum AuthorizationResult {
  Unauthorized = 'Unauthorized',
  Authorized = 'Authorized',
}

export class AlertsAuthorizationAuditLogger {
  private readonly auditLogger: LegacyAuditLogger;

  constructor(auditLogger: LegacyAuditLogger = { log() {} }) {
    this.auditLogger = auditLogger;
  }

  public getAuthorizationMessage(
    authorizationResult: AuthorizationResult,
    alertTypeId: string,
    scopeType: ScopeType,
    scope: string,
    operation: string
  ): string {
    return `${authorizationResult} to ${operation} a "${alertTypeId}" alert ${
      scopeType === ScopeType.Consumer ? `for "${scope}"` : `by "${scope}"`
    }`;
  }

  public alertsAuthorizationFailure(
    username: string,
    alertTypeId: string,
    scopeType: ScopeType,
    scope: string,
    operation: string
  ): string {
    const message = this.getAuthorizationMessage(
      AuthorizationResult.Unauthorized,
      alertTypeId,
      scopeType,
      scope,
      operation
    );
    this.auditLogger.log('alerts_authorization_failure', `${username} ${message}`, {
      username,
      alertTypeId,
      scopeType,
      scope,
      operation,
    });
    return message;
  }

  public alertsUnscopedAuthorizationFailure(username: string, operation: string): string {
    const message = `Unauthorized to ${operation} any alert types`;
    this.auditLogger.log('alerts_unscoped_authorization_failure', `${username} ${message}`, {
      username,
      operation,
    });
    return message;
  }

  public alertsAuthorizationSuccess(
    username: string,
    alertTypeId: string,
    scopeType: ScopeType,
    scope: string,
    operation: string
  ): string {
    const message = this.getAuthorizationMessage(
      AuthorizationResult.Authorized,
      alertTypeId,
      scopeType,
      scope,
      operation
    );
    this.auditLogger.log('alerts_authorization_success', `${username} ${message}`, {
      username,
      alertTypeId,
      scopeType,
      scope,
      operation,
    });
    return message;
  }

  public alertsBulkAuthorizationSuccess(
    username: string,
    authorizedEntries: Array<[string, string]>,
    scopeType: ScopeType,
    operation: string
  ): string {
    const message = `${AuthorizationResult.Authorized} to ${operation}: ${authorizedEntries
      .map(
        ([alertTypeId, scope]) =>
          `"${alertTypeId}" alert ${
            scopeType === ScopeType.Consumer ? `for "${scope}"` : `by "${scope}"`
          }`
      )
      .join(', ')}`;
    this.auditLogger.log('alerts_authorization_success', `${username} ${message}`, {
      username,
      scopeType,
      authorizedEntries,
      operation,
    });
    return message;
  }
}
