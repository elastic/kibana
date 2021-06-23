/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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

export class AlertingAuthorizationAuditLogger {
  private readonly auditLogger: LegacyAuditLogger;

  constructor(auditLogger: LegacyAuditLogger = { log() {} }) {
    this.auditLogger = auditLogger;
  }

  public getAuthorizationMessage(
    authorizationResult: AuthorizationResult,
    alertTypeId: string,
    scopeType: ScopeType,
    scope: string,
    operation: string,
    entity: string
  ): string {
    return `${authorizationResult} to ${operation} a "${alertTypeId}" ${entity} ${
      scopeType === ScopeType.Consumer ? `for "${scope}"` : `by "${scope}"`
    }`;
  }

  public logAuthorizationFailure(
    username: string,
    alertTypeId: string,
    scopeType: ScopeType,
    scope: string,
    operation: string,
    entity: string
  ): string {
    const message = this.getAuthorizationMessage(
      AuthorizationResult.Unauthorized,
      alertTypeId,
      scopeType,
      scope,
      operation,
      entity
    );
    this.auditLogger.log('alerting_authorization_failure', `${username} ${message}`, {
      username,
      alertTypeId,
      scopeType,
      scope,
      operation,
      entity,
    });
    return message;
  }

  public logUnscopedAuthorizationFailure(
    username: string,
    operation: string,
    entity: string
  ): string {
    const message = `Unauthorized to ${operation} ${entity}s for any rule types`;
    this.auditLogger.log('alerting_unscoped_authorization_failure', `${username} ${message}`, {
      username,
      operation,
    });
    return message;
  }

  public logAuthorizationSuccess(
    username: string,
    alertTypeId: string,
    scopeType: ScopeType,
    scope: string,
    operation: string,
    entity: string
  ): string {
    const message = this.getAuthorizationMessage(
      AuthorizationResult.Authorized,
      alertTypeId,
      scopeType,
      scope,
      operation,
      entity
    );
    this.auditLogger.log('alerting_authorization_success', `${username} ${message}`, {
      username,
      alertTypeId,
      scopeType,
      scope,
      operation,
      entity,
    });
    return message;
  }

  public logBulkAuthorizationSuccess(
    username: string,
    authorizedEntries: Array<[string, string]>,
    scopeType: ScopeType,
    operation: string,
    entity: string
  ): string {
    const message = `${AuthorizationResult.Authorized} to ${operation}: ${authorizedEntries
      .map(
        ([alertTypeId, scope]) =>
          `"${alertTypeId}" ${entity}s ${
            scopeType === ScopeType.Consumer ? `for "${scope}"` : `by "${scope}"`
          }`
      )
      .join(', ')}`;
    this.auditLogger.log('alerting_authorization_success', `${username} ${message}`, {
      username,
      scopeType,
      authorizedEntries,
      operation,
      entity,
    });
    return message;
  }
}
