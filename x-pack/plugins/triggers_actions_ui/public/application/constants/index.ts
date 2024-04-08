/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  ES_QUERY_ID,
  OBSERVABILITY_THRESHOLD_RULE_TYPE_ID,
  ML_ANOMALY_DETECTION_RULE_TYPE_ID,
  AlertConsumers,
} from '@kbn/rule-data-utils';
export {
  BASE_ALERTING_API_PATH,
  INTERNAL_BASE_ALERTING_API_PATH,
} from '@kbn/alerting-plugin/common';
export { BASE_ACTION_API_PATH, INTERNAL_BASE_ACTION_API_PATH } from '@kbn/actions-plugin/common';

export type Section = 'connectors' | 'rules' | 'alerts' | 'logs';

export const routeToHome = `/`;
export const routeToConnectors = `/connectors`;
export const routeToRules = `/rules`;
export const routeToLogs = `/logs`;
export const legacyRouteToAlerts = `/alerts`;
export const legacyRouteToRuleDetails = `/alert/:alertId`;

export const recoveredActionGroupMessage = i18n.translate(
  'xpack.triggersActionsUI.sections.actionForm.RecoveredMessage',
  {
    defaultMessage: 'Recovered',
  }
);

export const summaryMessage = i18n.translate(
  'xpack.triggersActionsUI.sections.actionForm.SummaryMessage',
  {
    defaultMessage: `The system has detected '{{alerts.new.count}}' new, '{{alerts.ongoing.count}}' ongoing, and '{{alerts.recovered.count}}' recovered alerts.`,
  }
);

export { TIME_UNITS } from './time_units';
export enum SORT_ORDERS {
  ASCENDING = 'asc',
  DESCENDING = 'desc',
}

export const DEFAULT_SEARCH_PAGE_SIZE: number = 10;

export const DEFAULT_CONNECTOR_RULES_LIST_PAGE_SIZE: number = 25;

export const DEFAULT_RULE_INTERVAL = '1m';

export const RULE_EXECUTION_LOG_COLUMN_IDS = [
  'rule_id',
  'rule_name',
  'space_ids',
  'id',
  'timestamp',
  'execution_duration',
  'status',
  'message',
  'num_active_alerts',
  'num_new_alerts',
  'num_recovered_alerts',
  'num_triggered_actions',
  'num_generated_actions',
  'num_succeeded_actions',
  'num_errored_actions',
  'total_search_duration',
  'es_search_duration',
  'schedule_delay',
  'timed_out',
  'maintenance_window_ids',
] as const;

export const RULE_EXECUTION_LOG_DURATION_COLUMNS = [
  'execution_duration',
  'total_search_duration',
  'es_search_duration',
  'schedule_delay',
];

export const RULE_EXECUTION_LOG_ALERT_COUNT_COLUMNS = [
  'num_new_alerts',
  'num_active_alerts',
  'num_recovered_alerts',
];

export const LOCKED_COLUMNS = [
  'rule_name',
  'timestamp',
  'execution_duration',
  'status',
  'message',
  'num_active_alerts',
  'num_errored_actions',
];

export const RULE_EXECUTION_DEFAULT_INITIAL_VISIBLE_COLUMNS = [...LOCKED_COLUMNS.slice(1)];
export const GLOBAL_EXECUTION_DEFAULT_INITIAL_VISIBLE_COLUMNS = [
  'rule_name',
  ...LOCKED_COLUMNS.slice(1),
];
export const DEFAULT_NUMBER_FORMAT = 'format:number:defaultPattern';

export const CONNECTOR_EXECUTION_LOG_COLUMN_IDS = [
  'connector_id',
  'space_ids',
  'id',
  'timestamp',
  'status',
  'connector_name',
  'message',
  'execution_duration',
  'schedule_delay',
  'timed_out',
] as const;

export const CONNECTOR_LOCKED_COLUMNS = ['timestamp', 'status', 'connector_name', 'message'];

export const GLOBAL_CONNECTOR_EXECUTION_DEFAULT_INITIAL_VISIBLE_COLUMNS = [
  ...CONNECTOR_LOCKED_COLUMNS,
];

export const MULTI_CONSUMER_RULE_TYPE_IDS = [
  OBSERVABILITY_THRESHOLD_RULE_TYPE_ID,
  ES_QUERY_ID,
  ML_ANOMALY_DETECTION_RULE_TYPE_ID,
];

export const ALERT_TABLE_GENERIC_CONFIG_ID = `${AlertConsumers.STACK_ALERTS}-generic-alerts-table`;

export const ALERT_TABLE_GLOBAL_CONFIG_ID = `${AlertConsumers.STACK_ALERTS}-global-alerts-table`;
