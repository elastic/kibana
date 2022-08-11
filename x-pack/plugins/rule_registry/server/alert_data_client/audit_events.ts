/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EcsEventOutcome, EcsEventType } from '@kbn/core/server';
import { AuditEvent } from '@kbn/security-plugin/server';
import { ReadOperations, WriteOperations } from '@kbn/alerting-plugin/server';

export enum AlertAuditAction {
  GET = 'alert_get',
  UPDATE = 'alert_update',
  FIND = 'alert_find',
}

export const operationAlertAuditActionMap = {
  [WriteOperations.Update]: AlertAuditAction.UPDATE,
  [ReadOperations.Find]: AlertAuditAction.FIND,
  [ReadOperations.Get]: AlertAuditAction.GET,
};

type VerbsTuple = [string, string, string];

const eventVerbs: Record<AlertAuditAction, VerbsTuple> = {
  alert_get: ['access', 'accessing', 'accessed'],
  alert_update: ['update', 'updating', 'updated'],
  alert_find: ['access', 'accessing', 'accessed'],
};

const eventTypes: Record<AlertAuditAction, EcsEventType> = {
  alert_get: 'access',
  alert_update: 'change',
  alert_find: 'access',
};

export interface AlertAuditEventParams {
  action: AlertAuditAction;
  outcome?: EcsEventOutcome;
  id?: string;
  error?: Error;
}

export function alertAuditEvent({ action, id, outcome, error }: AlertAuditEventParams): AuditEvent {
  const doc = id ? `alert [id=${id}]` : 'an alert';
  const [present, progressive, past] = eventVerbs[action];
  const message = error
    ? `Failed attempt to ${present} ${doc}`
    : outcome === 'unknown'
    ? `User is ${progressive} ${doc}`
    : `User has ${past} ${doc}`;
  const type = eventTypes[action];

  return {
    message,
    event: {
      action,
      category: ['database'],
      type: type ? [type] : undefined,
      outcome: outcome ?? (error ? 'failure' : 'success'),
    },
    error: error && {
      code: error.name,
      message: error.message,
    },
  };
}
