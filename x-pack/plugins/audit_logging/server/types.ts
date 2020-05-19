/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/** @public */
export interface AuditLogger {
  log: (eventType: string, message: string, data?: Record<any, unknown>) => void;
}

/** @public */
export interface AuditLoggingPluginSetup {
  __enableAuditLogging: () => void;
  __disableAuditLogging: () => void;
  createAuditLogger: (...contextParts: string[]) => AuditLogger;
}
