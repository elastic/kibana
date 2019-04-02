/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Legacy } from 'kibana';
// @ts-ignore
import { AuditLogger } from '../../../../server/lib/audit_logger';
import { EncryptedSavedObjectsAuditLogger } from './audit_logger';

export interface Logger {
  readonly audit: EncryptedSavedObjectsAuditLogger;
  debug(message: string): void;
}

export function createLogger(server: Legacy.Server) {
  const pluginId = 'encrypted_saved_object';
  return Object.freeze({
    audit: new EncryptedSavedObjectsAuditLogger(
      server.config().get('xpack.encrypted_saved_objects.audit.enabled'),
      new AuditLogger(server, pluginId)
    ),
    debug: (message: string) => server.log([pluginId, 'debug'], message),
  });
}
