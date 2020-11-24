/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AuditEvent, EventOutcome, EventCategory, EventType } from '../../../security/server';

export enum AlertRuleAction {
  CREATE = 'alert_rule_create',
  GET = 'alert_rule_get',
  UPDATE = 'alert_rule_update',
  UPDATE_API_KEY = 'alert_rule_update_api_key',
  ENABLE = 'alert_rule_enable',
  DISABLE = 'alert_rule_disable',
  DELETE = 'alert_rule_delete',
  FIND = 'alert_rule_find',
  MUTE = 'alert_rule_mute',
  UNMUTE = 'alert_rule_unmute',
  MUTE_INSTANCE = 'alert_instance_mute',
  UNMUTE_INSTANCE = 'alert_instance_unmute',
}

type VerbsTuple = [string, string, string];

const eventVerbs: Record<AlertRuleAction, VerbsTuple> = {
  alert_rule_create: ['create', 'creating', 'created'],
  alert_rule_get: ['access', 'accessing', 'accessed'],
  alert_rule_update: ['update', 'updating', 'updated'],
  alert_rule_update_api_key: ['update API key of', 'updating API key of', 'updated API key of'],
  alert_rule_enable: ['enable', 'enabling', 'enabled'],
  alert_rule_disable: ['disable', 'disabling', 'disabled'],
  alert_rule_delete: ['delete', 'deleting', 'deleted'],
  alert_rule_find: ['access', 'accessing', 'accessed'],
  alert_rule_mute: ['mute', 'muting', 'muted'],
  alert_rule_unmute: ['unmute', 'unmuting', 'unmuted'],
  alert_instance_mute: ['mute instance of', 'muting instance of', 'muted instance of'],
  alert_instance_unmute: ['unmute instance of', 'unmuting instance of', 'unmuted instance of'],
};

const eventTypes: Record<AlertRuleAction, EventType> = {
  alert_rule_create: EventType.CREATION,
  alert_rule_get: EventType.ACCESS,
  alert_rule_update: EventType.CHANGE,
  alert_rule_update_api_key: EventType.CHANGE,
  alert_rule_enable: EventType.CHANGE,
  alert_rule_disable: EventType.CHANGE,
  alert_rule_delete: EventType.DELETION,
  alert_rule_find: EventType.ACCESS,
  alert_rule_mute: EventType.CHANGE,
  alert_rule_unmute: EventType.CHANGE,
  alert_instance_mute: EventType.CHANGE,
  alert_instance_unmute: EventType.CHANGE,
};

export interface AlertRuleEventParams {
  action: AlertRuleAction;
  outcome?: EventOutcome;
  savedObject?: Required<Required<AuditEvent>['kibana']>['saved_object'];
  error?: Error;
}

export function alertRuleEvent({
  action,
  savedObject,
  outcome,
  error,
}: AlertRuleEventParams): AuditEvent {
  const doc = savedObject ? `alert rule [id=${savedObject.id}]` : 'an alert rule';
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
