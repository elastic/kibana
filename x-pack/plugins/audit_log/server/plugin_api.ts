/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Logger } from '../../../../src/core/server';
import {
  IAuditLog,
  IRegisterAuditLogOptions,
  IGetAuditLogOptions,
  IAuditLogPluginAPI,
} from './types';
import { AuditLog } from './audit_log';

// global map of all audit logs created
const AuditLogs: Map<string, IAuditLog> = new Map();

export class PluginAPI implements IAuditLogPluginAPI {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  // register a new audit log
  registerAuditLog(options: IRegisterAuditLogOptions): IAuditLog {
    if (AuditLogs.has(options.id)) {
      throw new Error(`audit log already registered: ${options.id}`);
    }

    const id = options.id;
    const recordSchema = options.recordSchema;
    const logger = this.logger;
    const auditLog = new AuditLog({ id, recordSchema, logger });
    AuditLogs.set(options.id, auditLog);

    return auditLog;
  }

  // get a previously registered audit log
  getAuditLog(options: IGetAuditLogOptions): IAuditLog {
    const result = AuditLogs.get(options.id);
    if (result == null) {
      throw new Error(`audit log not available for ${options.id}`);
    }

    return result;
  }

  // return whether a specified audit log has been registered
  hasAuditLog(options: IGetAuditLogOptions): boolean {
    return AuditLogs.has(options.id);
  }
}
