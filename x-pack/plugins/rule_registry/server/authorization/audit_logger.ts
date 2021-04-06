/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AuditLogger, EventCategory, EventOutcome, EventType } from '../../../security/server';

export enum AuthorizationResult {
  Unauthorized = 'Unauthorized',
  Authorized = 'Authorized',
}

export class RacAuthorizationAuditLogger {
  private readonly auditLogger: AuditLogger;

  constructor(auditLogger: AuditLogger = { log() {} }) {
    this.auditLogger = auditLogger;
  }

  public getAuthorizationMessage(
    authorizationResult: AuthorizationResult,
    owner: string,
    operation: string
  ): string {
    return `${authorizationResult} to ${operation} "${owner}" alert"`;
  }

  public racAuthorizationFailure({
    username,
    owner,
    operation,
    type,
    error,
  }: {
    username: string;
    owner: string;
    operation: string;
    type: EventType;
    error?: Error;
  }): string {
    const message = this.getAuthorizationMessage(
      AuthorizationResult.Unauthorized,
      owner,
      operation
    );
    this.auditLogger.log({
      message,
      event: {
        action: 'rac_authorization_failure',
        category: EventCategory.AUTHENTICATION,
        type,
        outcome: EventOutcome.FAILURE,
      },
      user: {
        name: username,
      },
      error: error && {
        code: error.name,
        message: error.message,
      },
    });
    return message;
  }

  public racUnscopedAuthorizationFailure({
    username,
    operation,
    type,
  }: {
    username: string;
    operation: string;
    type: EventType;
  }): string {
    const message = `Unauthorized to ${operation} any alerts`;
    this.auditLogger.log({
      message,
      event: {
        action: 'rac_authorization_failure',
        category: EventCategory.AUTHENTICATION,
        type,
        outcome: EventOutcome.FAILURE,
      },
      user: {
        name: username,
      },
    });
    return message;
  }

  public racAuthorizationSuccess({
    username,
    owner,
    operation,
    type,
  }: {
    username: string;
    owner: string;
    operation: string;
    type: EventType;
  }): string {
    const message = this.getAuthorizationMessage(AuthorizationResult.Authorized, owner, operation);
    this.auditLogger.log({
      message,
      event: {
        action: 'rac_authorization_success',
        category: EventCategory.AUTHENTICATION,
        type,
        outcome: EventOutcome.SUCCESS,
      },
      user: {
        name: username,
      },
    });
    return message;
  }
}
