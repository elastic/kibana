/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OperationDetails } from '.';
import { AuditLogger, EventCategory, EventOutcome } from '../../../security/server';

export enum AuthorizationResult {
  Unauthorized = 'Unauthorized',
  Authorized = 'Authorized',
}

export class AuthorizationAuditLogger {
  private readonly auditLogger?: AuditLogger;

  constructor(logger: AuditLogger | undefined) {
    this.auditLogger = logger;
  }

  public createMessage({
    result,
    className,
    operation,
  }: {
    result: AuthorizationResult;
    className: string;
    operation: OperationDetails;
  }): string {
    return `${result} to ${operation.name} of class "${className}"`;
  }

  public failure({
    username,
    className,
    operation,
  }: {
    username: string;
    className: string;
    operation: OperationDetails;
  }) {
    const message = this.createMessage({
      result: AuthorizationResult.Unauthorized,
      className,
      operation,
    });
    this.auditLogger?.log({
      message,
      event: {
        action: operation.action,
        category: EventCategory.AUTHENTICATION,
        type: operation.type,
        outcome: EventOutcome.FAILURE,
      },
      user: {
        name: username,
      },
    });
  }
}
