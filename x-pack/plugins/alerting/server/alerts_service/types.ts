/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyAlertSchema = any;

export interface AlertRuleSchema {
  id: string;
  name: string;
  consumer: string;
  type: string; // ruleTypeId
  execution: {
    id: string;
  };
}

// This schema is just for testing
// These are the fields the alerting framework would need
interface BaseAlertSchema {
  id: string; // alert id
  actionGroup: string; // action group id
  actionSubGroup?: string; // optional action subgroup id
}

interface BaseAlertSchema {
  id: string; // alert id
  actionGroup: string; // action group id
  actionSubGroup?: string; // optional action subgroup id
  status: string;
  rule: AlertRuleSchema;
  '@timestamp': string;
}

// When rule types create alerts, they must fill in the required fields in the
// BaseAlertSchema but can also add other fields (currently typed as any)
export type CreateAlertSchema = BaseAlertSchema & AnyAlertSchema;

// When the alerts client writes out alert documents, it will take the fields
// specified by the rule type on create and add a timestamp, rule information and status
export type AlertSchema = CreateAlertSchema & {
  status: string;
  uuid?: string;
  start?: string;
  duration?: string;
  end?: string;
  rule: AlertRuleSchema;
  '@timestamp': string;
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
  loadExistingAlerts(params: LoadExistingAlertsParams): Promise<AlertSchema[]>;

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
  writeAlerts(): void;

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
