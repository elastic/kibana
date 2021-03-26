/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OperationDetails } from '.';
import { AuditLogger, EventCategory, EventOutcome } from '../../../security/server';

enum AuthorizationResult {
  Unauthorized = 'Unauthorized',
  Authorized = 'Authorized',
}

export class AuthorizationAuditLogger {
  private readonly auditLogger?: AuditLogger;

  constructor(logger: AuditLogger | undefined) {
    this.auditLogger = logger;
  }

  private createMessage({
    result,
    className,
    operation,
  }: {
    result: AuthorizationResult;
    className?: string;
    operation: OperationDetails;
  }): string {
    // class: determine what we're calling this (don't use class)
    const classMsg = className == null ? 'of any class' : `of class "${className}"`;
    /**
     * This will take the form:
     * `Unauthorized to create case of class "securitySolution"`
     * `Unauthorized to find cases of any class`.
     */
    return `${result} to ${operation.verbs.present} ${operation.docType} ${classMsg}`;
  }

  private logSuccessEvent({
    message,
    operation,
    username,
  }: {
    message: string;
    operation: OperationDetails;
    username?: string;
  }) {
    this.auditLogger?.log({
      message,
      event: {
        action: operation.action,
        category: EventCategory.DATABASE,
        type: operation.type,
        outcome: EventOutcome.SUCCESS,
      },
      ...(username != null && {
        user: {
          name: username,
        },
      }),
    });
  }

  public failure({
    username,
    className,
    operation,
  }: {
    username?: string;
    className?: string;
    operation: OperationDetails;
  }): string {
    const message = this.createMessage({
      result: AuthorizationResult.Unauthorized,
      className,
      operation,
    });
    this.auditLogger?.log({
      message,
      event: {
        action: operation.action,
        category: EventCategory.DATABASE,
        type: operation.type,
        outcome: EventOutcome.FAILURE,
      },
      // add the user information if we have it
      ...(username != null && {
        user: {
          name: username,
        },
      }),
    });
    return message;
  }

  public success({
    username,
    operation,
    className,
  }: {
    username: string;
    className: string;
    operation: OperationDetails;
  }): string {
    const message = this.createMessage({
      result: AuthorizationResult.Authorized,
      className,
      operation,
    });
    this.logSuccessEvent({ message, operation, username });
    return message;
  }

  public bulkSuccess({
    username,
    operation,
    classNames,
  }: {
    username?: string;
    classNames: string[];
    operation: OperationDetails;
  }): string {
    const message = `${AuthorizationResult.Authorized} to ${operation.verbs.present} ${
      operation.docType
    } of class: ${classNames.join(', ')}`;
    this.logSuccessEvent({ message, operation, username });
    return message;
  }
}
