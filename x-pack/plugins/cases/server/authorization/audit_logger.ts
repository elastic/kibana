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
    owner,
    operation,
  }: {
    result: AuthorizationResult;
    owner?: string;
    operation: OperationDetails;
  }): string {
    const ownerMsg = owner == null ? 'of any owner' : `with "${owner}" as the owner`;
    /**
     * This will take the form:
     * `Unauthorized to create case with "securitySolution" as the owner`
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
    owner,
    operation,
  }: {
    username?: string;
    owner?: string;
    operation: OperationDetails;
  }): string {
    const message = this.createMessage({
      result: AuthorizationResult.Unauthorized,
      owner,
      operation,
    });
    this.auditLogger?.log({
      message: `${username ?? 'unknown user'} ${message}`,
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
    owner,
  }: {
    username: string;
    owner: string;
    operation: OperationDetails;
  }): string {
    const message = this.createMessage({
      result: AuthorizationResult.Authorized,
      owner,
      operation,
    });
    this.logSuccessEvent({ message, operation, username });
    return message;
  }

  public bulkSuccess({
    username,
    operation,
    owners,
  }: {
    username?: string;
    owners: string[];
    operation: OperationDetails;
  }): string {
    const message = `${AuthorizationResult.Authorized} to ${operation.verbs.present} ${
      operation.docType
    } of owner: ${owners.join(', ')}`;
    this.logSuccessEvent({ message, operation, username });
    return message;
  }
}
