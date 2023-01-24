/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EcsEventOutcome, EcsEventType } from '@kbn/core/server';
import { AuditEvent } from '@kbn/security-plugin/server';

export enum RuleAuditAction {
  CREATE = 'rule_create',
  GET = 'rule_get',
  RESOLVE = 'rule_resolve',
  UPDATE = 'rule_update',
  UPDATE_API_KEY = 'rule_update_api_key',
  ENABLE = 'rule_enable',
  DISABLE = 'rule_disable',
  DELETE = 'rule_delete',
  FIND = 'rule_find',
  MUTE = 'rule_mute',
  UNMUTE = 'rule_unmute',
  MUTE_ALERT = 'rule_alert_mute',
  UNMUTE_ALERT = 'rule_alert_unmute',
  AGGREGATE = 'rule_aggregate',
  BULK_EDIT = 'rule_bulk_edit',
  GET_EXECUTION_LOG = 'rule_get_execution_log',
  GET_GLOBAL_EXECUTION_LOG = 'rule_get_global_execution_log',
  GET_GLOBAL_EXECUTION_KPI = 'rule_get_global_execution_kpi',
  GET_ACTION_ERROR_LOG = 'rule_get_action_error_log',
  GET_RULE_EXECUTION_KPI = 'rule_get_execution_kpi',
  SNOOZE = 'rule_snooze',
  UNSNOOZE = 'rule_unsnooze',
  RUN_SOON = 'rule_run_soon',
}

type VerbsTuple = [string, string, string];

const eventVerbs: Record<RuleAuditAction, VerbsTuple> = {
  rule_create: ['create', 'creating', 'created'],
  rule_get: ['access', 'accessing', 'accessed'],
  rule_resolve: ['access', 'accessing', 'accessed'],
  rule_update: ['update', 'updating', 'updated'],
  rule_bulk_edit: ['update', 'updating', 'updated'],
  rule_update_api_key: ['update API key of', 'updating API key of', 'updated API key of'],
  rule_enable: ['enable', 'enabling', 'enabled'],
  rule_disable: ['disable', 'disabling', 'disabled'],
  rule_delete: ['delete', 'deleting', 'deleted'],
  rule_find: ['access', 'accessing', 'accessed'],
  rule_mute: ['mute', 'muting', 'muted'],
  rule_unmute: ['unmute', 'unmuting', 'unmuted'],
  rule_alert_mute: ['mute alert of', 'muting alert of', 'muted alert of'],
  rule_alert_unmute: ['unmute alert of', 'unmuting alert of', 'unmuted alert of'],
  rule_aggregate: ['access', 'accessing', 'accessed'],
  rule_get_execution_log: [
    'access execution log for',
    'accessing execution log for',
    'accessed execution log for',
  ],
  rule_get_global_execution_log: [
    'access execution log',
    'accessing execution log',
    'accessed execution log',
  ],
  rule_get_action_error_log: [
    'access action error log for',
    'accessing action error log for',
    'accessed action error log for',
  ],
  rule_snooze: ['snooze', 'snoozing', 'snoozed'],
  rule_unsnooze: ['unsnooze', 'unsnoozing', 'unsnoozed'],
  rule_run_soon: ['run', 'running', 'ran'],
  rule_get_execution_kpi: [
    'access execution KPI for',
    'accessing execution KPI for',
    'accessed execution KPI for',
  ],
  rule_get_global_execution_kpi: [
    'access global execution KPI for',
    'accessing global execution KPI for',
    'accessed global execution KPI for',
  ],
};

const eventTypes: Record<RuleAuditAction, EcsEventType> = {
  rule_create: 'creation',
  rule_get: 'access',
  rule_resolve: 'access',
  rule_update: 'change',
  rule_bulk_edit: 'change',
  rule_update_api_key: 'change',
  rule_enable: 'change',
  rule_disable: 'change',
  rule_delete: 'deletion',
  rule_find: 'access',
  rule_mute: 'change',
  rule_unmute: 'change',
  rule_alert_mute: 'change',
  rule_alert_unmute: 'change',
  rule_aggregate: 'access',
  rule_get_execution_log: 'access',
  rule_get_global_execution_log: 'access',
  rule_get_action_error_log: 'access',
  rule_snooze: 'change',
  rule_unsnooze: 'change',
  rule_run_soon: 'access',
  rule_get_execution_kpi: 'access',
  rule_get_global_execution_kpi: 'access',
};

export interface RuleAuditEventParams {
  action: RuleAuditAction;
  outcome?: EcsEventOutcome;
  savedObject?: NonNullable<AuditEvent['kibana']>['saved_object'];
  error?: Error;
}

export function ruleAuditEvent({
  action,
  savedObject,
  outcome,
  error,
}: RuleAuditEventParams): AuditEvent {
  const doc = savedObject ? `rule [id=${savedObject.id}]` : 'a rule';
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
