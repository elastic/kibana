/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EcsEventOutcome } from '@kbn/logging';
import { AuditEvent } from '@kbn/security-plugin/server';

export type AuditAction = 'create' | 'delete';

interface CreateAuditEventArgs {
  message: string;
  action: AuditAction;
  error?: Error;
  outcome?: EcsEventOutcome;
}

export function createAuditEvent({
  message,
  action,
  error,
  outcome,
}: CreateAuditEventArgs): AuditEvent {
  return {
    message,
    event: {
      action,
      outcome: outcome ?? error ? 'failure' : 'success',
    },
    error: error && {
      message: error?.message,
    },
  };
}
