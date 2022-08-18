/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERT_ACTION_GROUP,
  ALERT_ACTION_SUBGROUP,
  ALERT_DURATION,
  ALERT_END,
  ALERT_INSTANCE_ID,
  ALERT_LAST_NOTIFIED_DATE,
  ALERT_RULE_CATEGORY,
  ALERT_RULE_CONSUMER,
  ALERT_RULE_EXECUTION_UUID,
  ALERT_RULE_NAME,
  ALERT_RULE_PRODUCER,
  ALERT_RULE_TAGS,
  ALERT_RULE_TYPE_ID,
  ALERT_RULE_UUID,
  ALERT_START,
  ALERT_STATUS,
  ALERT_UUID,
  TIMESTAMP,
} from '@kbn/rule-data-utils';
import { AlertingEventLogger } from '../lib/alerting_event_logger/alerting_event_logger';
import { RuleRunMetricsStore } from '../lib/rule_run_metrics_store';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyAlertSchema = any;

// Using rule registry fields for now
export interface AlertRuleSchema {
  [ALERT_RULE_CATEGORY]: string;
  [ALERT_RULE_CONSUMER]: string;
  [ALERT_RULE_EXECUTION_UUID]: string;
  [ALERT_RULE_NAME]: string;
  [ALERT_RULE_PRODUCER]: string;
  [ALERT_RULE_TAGS]: string[];
  [ALERT_RULE_TYPE_ID]: string;
  [ALERT_RULE_UUID]: string;
}

// This schema is just for testing
// These are the fields the alerting framework would need
interface BaseAlertSchema {
  [ALERT_INSTANCE_ID]: string; // alert id
  [ALERT_ACTION_GROUP]: string; // action group id
  [ALERT_ACTION_SUBGROUP]?: string; // optional action subgroup id
}

// When rule types create alerts, they must fill in the required fields in the
// BaseAlertSchema but can also add other fields (currently typed as any)
export type CreateAlertSchema = BaseAlertSchema & AnyAlertSchema;

// When the alerts client writes out alert documents, it will take the fields
// specified by the rule type on create and add a timestamp, rule information and status
export type AlertSchema = CreateAlertSchema &
  AlertRuleSchema & {
    [ALERT_STATUS]: string;
    [ALERT_UUID]?: string;
    [ALERT_START]?: string;
    [ALERT_DURATION]?: string;
    [ALERT_END]?: string;
    [TIMESTAMP]: string;
    [ALERT_LAST_NOTIFIED_DATE]: string;
  };

export interface IAlertsClient {
  /**
   * Sets information about the rule.
   */
  setRuleData(rule: AlertRuleSchema): void;

  /**
   * Flag indicating whether max number of alerts has been reported.
   */
  hasReachedAlertLimit(): boolean;

  /**
   * Get alerts matching given rule ID and rule execution uuid
   * - Allow specifying a different index than the default (for security alerts)
   */
  loadExistingAlerts(params: LoadExistingAlertsParams): Promise<void>;

  /**
   * Creates new alert document
   * - Do not allow specifying different index. Security alerts should use rule registry
   * - Schema of alert is context and state
   * - Include actionGroup and subActionGroup for alert in schema
   */
  create(alert: CreateAlertSchema): void;

  /**
   * Returns list of existing alerts (alerts from previous rule execution)
   * - Rule types might need this access alert state values (previously stored in task manager doc)
   * - Returns a copy so the original list cannot be corrupted
   */
  getExistingAlerts(): AlertSchema[];

  /**
   * Returns list of recovered alerts, as determined by framework
   * - Skip requiring done() to be called, just throw error if create() is called after this is called
   */
  getRecoveredAlerts(): AlertSchema[];

  /**
   * Partially update an alert document
   * - Can use this for recovery alerts
   * - Control which fields can be updated?
   */
  update(id: string, updatedAlert: Partial<AlertSchema>): void;

  /**
   * Triggers auto-recovery detection unless rule type has opted out
   * Writes all alerts to default index.
   * Handles logging to event log as well
   */
  writeAlerts(params?: WriteAlertParams): void;

  /**
   * This might not belong on the AlertsClient but putting it here for now
   */
  scheduleActions(params: ScheduleActionsParams): void;

  /**
   * Returns subset of functions available to rule executors
   * Don't expose any functions with direct read or write access to the alerts index
   */
  getExecutorServices(): PublicAlertsClient;
}

export type PublicAlertsClient = Pick<
  IAlertsClient,
  'create' | 'getRecoveredAlerts' | 'getExistingAlerts' | 'update'
>;

export interface LoadExistingAlertsParams {
  ruleId: string;
  previousRuleExecutionUuid: string;
  alertsIndex?: string;
}

export interface WriteAlertParams {
  eventLogger: AlertingEventLogger;
  metricsStore: RuleRunMetricsStore;
}

export interface ScheduleActionsParams {
  mutedAlertIds: Set<string>;
  throttle: string | null;
  notifyWhen: string | null;
  metricsStore: RuleRunMetricsStore;
}

export const DEFAULT_ALERTS_INDEX = '.alerts-default';
export const ILM_POLICY_NAME = 'alerts-default-policy';
export const INDEX_TEMPLATE_NAME = 'alerts-default-template';
export const DEFAULT_ILM_POLICY = {
  policy: {
    phases: {
      hot: {
        actions: {
          rollover: {
            max_age: '30d',
            max_primary_shard_size: '50gb',
          },
        },
      },
    },
  },
};
export const ALERTS_COMPONENT_TEMPLATE_NAME = 'alerts-mappings';
export const ECS_COMPONENT_TEMPLATE_NAME = 'ecs-mappings';
