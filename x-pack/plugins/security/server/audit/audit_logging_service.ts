/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Logger } from 'src/core/server';
import { TypeOf } from '@kbn/config-schema';
import { SecurityLicense } from '../../common/licensing';
import { ConfigSchema } from '../config';

export interface AuditLogger {
  log: (eventType: string, message: string, data?: Record<any, unknown>) => void;
}

export interface AuditLoggingServiceSetup {
  createAuditLogger: (logger: Logger) => AuditLogger;
}

export class AuditLoggingService {
  constructor(
    private readonly config: TypeOf<typeof ConfigSchema>,
    private readonly securityLicense: SecurityLicense
  ) {}

  public setup(): AuditLoggingServiceSetup {
    return {
      createAuditLogger: (baseLogger: Logger): AuditLogger => {
        const loggers = new Map<string, Logger>();
        const auditLoggingEnabled = this.config.audit.enabled;
        return {
          log: (eventType: string, message: string, data: Record<any, unknown> = {}) => {
            if (!auditLoggingEnabled || !this.securityLicense.getFeatures().allowAuditLogging) {
              return;
            }
            if (!loggers.has(eventType)) {
              loggers.set(eventType, baseLogger.get(eventType));
            }
            loggers.get(eventType)!.info(message, { ...data, eventType });
          },
        };
      },
    };
  }
}
