/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// TODO: https://github.com/elastic/kibana/issues/110895
/* eslint-disable @kbn/eslint/no_export_all */

import { AlertsHealth } from './rule';

export * from './rule';
export * from './rules_settings';
export * from './rule_type';
export * from './lib';
export type {
  ThrottledActions,
  LastScheduledActions,
  AlertInstanceMeta,
  AlertInstanceState,
  AlertInstanceContext,
  RawAlertInstance,
  TrackedLifecycleAlertState,
  WrappedLifecycleRuleState,
  RuleTaskState,
  RuleTaskParams,
} from '@kbn/alerting-state-types';
export * from './alert_summary';
export * from './builtin_action_groups';
export * from './bulk_edit';
export * from './disabled_action_groups';
export * from './rule_notify_when_type';
export * from './parse_duration';
export * from './execution_log_types';
export * from './rule_snooze_type';
export * from './rrule_type';
export * from './rule_tags_aggregation';
export * from './iso_weekdays';
export * from './saved_objects/rules/mappings';
export * from './rule_circuit_breaker_error_message';
export * from './maintenance_window_scoped_query_error_message';
export * from './action_ref_prefix';

export type {
  MaintenanceWindowModificationMetadata,
  DateRange,
  MaintenanceWindowSOProperties,
  MaintenanceWindowSOAttributes,
  MaintenanceWindow,
  MaintenanceWindowCreateBody,
  MaintenanceWindowClientContext,
  MaintenanceWindowDeepLinkIds,
  ScopedQueryAttributes,
} from './maintenance_window';

export {
  MaintenanceWindowStatus,
  MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE,
  MAINTENANCE_WINDOW_FEATURE_ID,
  MAINTENANCE_WINDOW_API_PRIVILEGES,
  MAINTENANCE_WINDOWS_APP_ID,
  MANAGEMENT_APP_ID,
  MAINTENANCE_WINDOW_PATHS,
  MAINTENANCE_WINDOW_DEEP_LINK_IDS,
  MAINTENANCE_WINDOW_DATE_FORMAT,
} from './maintenance_window';

export {
  mappingFromFieldMap,
  getComponentTemplateFromFieldMap,
  contextToSchemaName,
} from './alert_schema';

export interface AlertingFrameworkHealth {
  isSufficientlySecure: boolean;
  hasPermanentEncryptionKey: boolean;
  alertingFrameworkHealth: AlertsHealth;
}

export const LEGACY_BASE_ALERT_API_PATH = '/api/alerts';
export const BASE_ALERTING_API_PATH = '/api/alerting';
export const INTERNAL_BASE_ALERTING_API_PATH = '/internal/alerting' as const;
export const INTERNAL_ALERTING_SNOOZE_RULE =
  `${INTERNAL_BASE_ALERTING_API_PATH}/rule/{id}/_snooze` as const;
export const INTERNAL_ALERTING_API_FIND_RULES_PATH =
  `${INTERNAL_BASE_ALERTING_API_PATH}/rules/_find` as const;

export const INTERNAL_ALERTING_API_MAINTENANCE_WINDOW_PATH =
  `${INTERNAL_BASE_ALERTING_API_PATH}/rules/maintenance_window` as const;
export const INTERNAL_ALERTING_API_GET_ACTIVE_MAINTENANCE_WINDOWS_PATH =
  `${INTERNAL_ALERTING_API_MAINTENANCE_WINDOW_PATH}/_active` as const;

export const INTERNAL_ALERTING_BACKFILL_API_PATH =
  `${INTERNAL_BASE_ALERTING_API_PATH}/rules/backfill` as const;
export const INTERNAL_ALERTING_BACKFILL_FIND_API_PATH =
  `${INTERNAL_ALERTING_BACKFILL_API_PATH}/_find` as const;

export const ALERTING_FEATURE_ID = 'alerts';
export const MONITORING_HISTORY_LIMIT = 200;
export const ENABLE_MAINTENANCE_WINDOWS = true;
