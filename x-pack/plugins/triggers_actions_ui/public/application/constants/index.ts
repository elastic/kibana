/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export {
  BASE_ALERTING_API_PATH,
  INTERNAL_BASE_ALERTING_API_PATH,
} from '../../../../alerting/common';
export { BASE_ACTION_API_PATH, INTERNAL_BASE_ACTION_API_PATH } from '../../../../actions/common';

export type Section = 'connectors' | 'rules' | 'alerts' | '__components_sandbox';

export const routeToHome = `/`;
export const routeToConnectors = `/connectors`;
export const routeToRules = `/rules`;
export const routeToRuleDetails = `/rule/:ruleId`;
export const routeToInternalAlerts = `/alerts`;
export const routeToInternalShareableComponentsSandbox = '/__components_sandbox';
export const legacyRouteToRules = `/alerts`;
export const legacyRouteToRuleDetails = `/alert/:alertId`;

export const recoveredActionGroupMessage = i18n.translate(
  'xpack.triggersActionsUI.sections.actionForm.RecoveredMessage',
  {
    defaultMessage: 'Recovered',
  }
);

export { TIME_UNITS } from './time_units';
export enum SORT_ORDERS {
  ASCENDING = 'asc',
  DESCENDING = 'desc',
}

export const DEFAULT_SEARCH_PAGE_SIZE: number = 10;

export const DEFAULT_RULE_INTERVAL = '1m';

export const RULE_EXECUTION_LOG_COLUMN_IDS = [
  'id',
  'timestamp',
  'execution_duration',
  'status',
  'message',
  'num_active_alerts',
  'num_new_alerts',
  'num_recovered_alerts',
  'num_triggered_actions',
  'num_scheduled_actions',
  'num_succeeded_actions',
  'num_errored_actions',
  'total_search_duration',
  'es_search_duration',
  'schedule_delay',
  'timed_out',
] as const;

export const RULE_EXECUTION_LOG_DURATION_COLUMNS = [
  'execution_duration',
  'total_search_duration',
  'es_search_duration',
  'schedule_delay',
];

export const RULE_EXECUTION_DEFAULT_INITIAL_VISIBLE_COLUMNS = [
  'timestamp',
  'execution_duration',
  'status',
  'message',
];
