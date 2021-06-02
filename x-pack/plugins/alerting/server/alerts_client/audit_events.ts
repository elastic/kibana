/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EcsEventOutcome, EcsEventType } from 'src/core/server';
import { AuditEvent } from '../../../security/server';

export enum AlertAuditAction {
  CREATE = 'alert_create',
  GET = 'alert_get',
  UPDATE = 'alert_update',
  UPDATE_API_KEY = 'alert_update_api_key',
  ENABLE = 'alert_enable',
  DISABLE = 'alert_disable',
  DELETE = 'alert_delete',
  FIND = 'alert_find',
  MUTE = 'alert_mute',
  UNMUTE = 'alert_unmute',
  MUTE_INSTANCE = 'alert_instance_mute',
  UNMUTE_INSTANCE = 'alert_instance_unmute',
}

type VerbsTuple = [string, string, string];

const eventVerbs: Record<AlertAuditAction, VerbsTuple> = {
  alert_create: ['create', 'creating', 'created'],
  alert_get: ['access', 'accessing', 'accessed'],
  alert_update: ['update', 'updating', 'updated'],
  alert_update_api_key: ['update API key of', 'updating API key of', 'updated API key of'],
  alert_enable: ['enable', 'enabling', 'enabled'],
  alert_disable: ['disable', 'disabling', 'disabled'],
  alert_delete: ['delete', 'deleting', 'deleted'],
  alert_find: ['access', 'accessing', 'accessed'],
  alert_mute: ['mute', 'muting', 'muted'],
  alert_unmute: ['unmute', 'unmuting', 'unmuted'],
  alert_instance_mute: ['mute instance of', 'muting instance of', 'muted instance of'],
  alert_instance_unmute: ['unmute instance of', 'unmuting instance of', 'unmuted instance of'],
};

const eventTypes: Record<AlertAuditAction, EcsEventType> = {
  alert_create: 'creation',
  alert_get: 'access',
  alert_update: 'change',
  alert_update_api_key: 'change',
  alert_enable: 'change',
  alert_disable: 'change',
  alert_delete: 'deletion',
  alert_find: 'access',
  alert_mute: 'change',
  alert_unmute: 'change',
  alert_instance_mute: 'change',
  alert_instance_unmute: 'change',
};

export interface AlertAuditEventParams {
  action: AlertAuditAction;
  outcome?: EcsEventOutcome;
  savedObject?: NonNullable<AuditEvent['kibana']>['saved_object'];
  error?: Error;
}

export function alertAuditEvent({
  action,
  savedObject,
  outcome,
  error,
}: AlertAuditEventParams): AuditEvent {
  const doc = savedObject ? `alert [id=${savedObject.id}]` : 'an alert';
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
    kibana: {
      saved_object: savedObject,
    },
    error: error && {
      code: error.name,
      message: error.message,
    },
  };
}
