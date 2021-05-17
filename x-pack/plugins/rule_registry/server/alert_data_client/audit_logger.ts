/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EcsEventType } from '@kbn/logging';
import { AuditLogger } from '../../../security/server';

export enum AuthorizationResult {
  Unauthorized = 'Unauthorized',
  Authorized = 'Authorized',
}

export enum Result {
  Success = 'Success',
  Failure = 'Failure',
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
    owner,
    operation,
    type,
    error,
  }: {
    owner: string;
    operation: string;
    type: EcsEventType;
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
        category: ['authentication'],
        type: [type],
        outcome: 'failure',
      },
      error: error && {
        code: error.name,
        message: error.message,
      },
    });
    return message;
  }

  public racAuthorizationSuccess({
    owner,
    operation,
    type,
  }: {
    owner: string;
    operation: string;
    type: EcsEventType;
  }): string {
    const message = this.getAuthorizationMessage(AuthorizationResult.Authorized, owner, operation);
    this.auditLogger.log({
      message,
      event: {
        action: 'rac_authorization_success',
        category: ['authentication'],
        type: [type],
        outcome: 'success',
      },
    });
    return message;
  }
}
