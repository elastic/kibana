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
export * from './rule_task_instance';
export * from './alert_instance';
export * from './alert_summary';
export * from './builtin_action_groups';
export * from './bulk_edit';
export * from './disabled_action_groups';
export * from './rule_notify_when_type';
export * from './parse_duration';
export * from './execution_log_types';
export * from './rule_snooze_type';

export { mappingFromFieldMap, getComponentTemplateFromFieldMap } from './alert_schema';

export interface AlertingFrameworkHealth {
  isSufficientlySecure: boolean;
  hasPermanentEncryptionKey: boolean;
  alertingFrameworkHealth: AlertsHealth;
}

export const LEGACY_BASE_ALERT_API_PATH = '/api/alerts';
export const BASE_ALERTING_API_PATH = '/api/alerting';
export const INTERNAL_BASE_ALERTING_API_PATH = '/internal/alerting';
export const ALERTS_FEATURE_ID = 'alerts';
export const MONITORING_HISTORY_LIMIT = 200;
