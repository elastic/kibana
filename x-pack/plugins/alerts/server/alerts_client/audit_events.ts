/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AuditEvent, EventOutcome, EventCategory, EventType } from '../../../security/server';

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

const eventTypes: Record<AlertAuditAction, EventType> = {
  alert_create: EventType.CREATION,
  alert_get: EventType.ACCESS,
  alert_update: EventType.CHANGE,
  alert_update_api_key: EventType.CHANGE,
  alert_enable: EventType.CHANGE,
  alert_disable: EventType.CHANGE,
  alert_delete: EventType.DELETION,
  alert_find: EventType.ACCESS,
  alert_mute: EventType.CHANGE,
  alert_unmute: EventType.CHANGE,
  alert_instance_mute: EventType.CHANGE,
  alert_instance_unmute: EventType.CHANGE,
};

export interface AlertAuditEventParams {
  action: AlertAuditAction;
  outcome?: EventOutcome;
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
    : outcome === EventOutcome.UNKNOWN
    ? `User is ${progressive} ${doc}`
    : `User has ${past} ${doc}`;
  const type = eventTypes[action];

  return {
    message,
    event: {
      action,
      category: EventCategory.DATABASE,
      type,
      outcome: outcome ?? (error ? EventOutcome.FAILURE : EventOutcome.SUCCESS),
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
