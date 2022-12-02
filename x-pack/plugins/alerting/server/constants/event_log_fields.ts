/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ERROR_MESSAGE = 'error.message';
export const EVENT_ACTION = 'event.action';
export const EVENT_DURATION = 'event.duration';
export const KIBANA_ALERTING_OUTCOME = 'kibana.alerting.outcome';
export const ES_SEARCH_DURATION_FIELD = 'kibana.alert.rule.execution.metrics.es_search_duration_ms';
export const EXECUTION_UUID_FIELD = 'kibana.alert.rule.execution.uuid';
export const MESSAGE_FIELD = 'message';
export const NUMBER_OF_ACTIVE_ALERTS_FIELD =
  'kibana.alert.rule.execution.metrics.alert_counts.active';
export const NUMBER_OF_GENERATED_ACTIONS_FIELD =
  'kibana.alert.rule.execution.metrics.number_of_generated_actions';
export const NUMBER_OF_NEW_ALERTS_FIELD = 'kibana.alert.rule.execution.metrics.alert_counts.new';
export const NUMBER_OF_RECOVERED_ALERTS_FIELD =
  'kibana.alert.rule.execution.metrics.alert_counts.recovered';
export const NUMBER_OF_TRIGGERED_ACTIONS_FIELD =
  'kibana.alert.rule.execution.metrics.number_of_triggered_actions';
export const OUTCOME_FIELD = 'event.outcome';
export const PROVIDER_FIELD = 'event.provider';
export const RULE_ID_FIELD = 'rule.id';
export const RULE_NAME_FIELD = 'rule.name';
export const SCHEDULE_DELAY_FIELD = 'kibana.task.schedule_delay';
export const SPACE_ID_FIELD = 'kibana.space_ids';
export const START_FIELD = 'event.start';
export const TOTAL_SEARCH_DURATION_FIELD =
  'kibana.alert.rule.execution.metrics.total_search_duration_ms';
export const VERSION_FIELD = 'kibana.version';
export const TIMESTAMP = '@timestamp';

export const ALERTING_PROVIDER = 'alerting';
export const ACTIONS_PROVIDER = 'actions';
