/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { AuditLogger } from '@kbn/security-plugin/server';

import { appContextService } from './app_context';

class AuditLoggingService {
  private auditLogger?: AuditLogger;

  public start(request: KibanaRequest) {
    const securitySetup = appContextService.getSecuritySetup();

    this.auditLogger = securitySetup.audit.asScoped(request);
  }

  /**
   * Write a custom audit log record. If a current request is available, the log will include
   * user/session data. If not, an unscoped audit logger will be used.
   */
  public writeCustomAuditLog(...args: Parameters<AuditLogger['log']>) {
    // If a caller attempts to write an audit log without calling `start` first
    // and providing a request, we'll log the provided data to the unscoped logger
    if (!this.auditLogger) {
      const securitySetup = appContextService.getSecuritySetup();
      securitySetup.audit.withoutRequest.log(...args);

      return;
    }

    this.auditLogger.log(...args);
  }

  /**
   * Helper method for writing saved object related audit logs. Since Fleet
   * uses an internal SO client to support its custom RBAC model around Fleet/Integrations
   * permissions, we need to implement our own audit logging for saved objects that use the
   * internal client. This helper reduces the boilerplate around audit logging in those cases.
   *
   * @example
   * ```ts
   * auditLoggingService.writeCustomSoAuditLog({
   *   action: 'find',
   *   id: 'some-id-123',
   *   savedObjectType: PACKAGE_POLICY_SAVED_OBJECT_TYPE
   * });
   * ```
   */
  public writeCustomSoAuditLog({
    action,
    id,
    savedObjectType,
  }: {
    action: 'find' | 'get' | 'create' | 'update' | 'delete';
    id: string;
    savedObjectType: string;
  }) {
    this.writeCustomAuditLog({
      message: `User ${
        action === 'find' || action === 'get' ? 'has accessed' : 'is accessing'
      } ${savedObjectType} [id=${id}]`,
      event: {
        action: `saved_object_${action}`,
        category: ['database'],
        outcome: 'unknown',
        type: ['access'],
      },
      kibana: {
        saved_object: {
          id,
          type: savedObjectType,
        },
      },
    });
  }
}

export const auditLoggingService = new AuditLoggingService();
