/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DATABASE_CATEGORY, ECS_OUTCOMES, OperationDetails } from '.';
import { AuditLogger } from '../../../security/server';

enum AuthorizationResult {
  Unauthorized = 'Unauthorized',
  Authorized = 'Authorized',
}

export class AuthorizationAuditLogger {
  private readonly auditLogger?: AuditLogger;

  constructor(logger: AuditLogger | undefined) {
    this.auditLogger = logger;
  }

  private static createMessage({
    result,
    owners,
    operation,
  }: {
    result: AuthorizationResult;
    owners?: string[];
    operation: OperationDetails;
  }): string {
    const ownerMsg = owners == null ? 'of any owner' : `with owners: "${owners.join(', ')}"`;
    /**
     * This will take the form:
     * `Unauthorized to create case with owners: "securitySolution, observability"`
     * `Unauthorized to find cases of any owner`.
     */
    return `${result} to ${operation.verbs.present} ${operation.docType} ${ownerMsg}`;
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
      message: `${username ?? 'unknown user'} ${message}`,
      event: {
        action: operation.action,
        category: DATABASE_CATEGORY,
        type: [operation.type],
        outcome: ECS_OUTCOMES.success,
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
    owners,
    operation,
  }: {
    username?: string;
    owners?: string[];
    operation: OperationDetails;
  }): string {
    const message = AuthorizationAuditLogger.createMessage({
      result: AuthorizationResult.Unauthorized,
      owners,
      operation,
    });
    this.auditLogger?.log({
      message: `${username ?? 'unknown user'} ${message}`,
      event: {
        action: operation.action,
        category: DATABASE_CATEGORY,
        type: [operation.type],
        outcome: ECS_OUTCOMES.failure,
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
    owners,
  }: {
    username?: string;
    owners: string[];
    operation: OperationDetails;
  }): string {
    const message = AuthorizationAuditLogger.createMessage({
      result: AuthorizationResult.Authorized,
      owners,
      operation,
    });
    this.logSuccessEvent({ message, operation, username });
    return message;
  }
}
