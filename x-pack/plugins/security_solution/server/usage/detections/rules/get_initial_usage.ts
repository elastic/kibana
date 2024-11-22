/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  EventLogStatusMetric,
  MaxAvgMin,
  RulesTypeUsage,
  SingleEventLogStatusMetric,
  SingleEventMetric,
  AlertSuppressionUsage,
} from './types';

export const initialAlertSuppression: AlertSuppressionUsage = {
  enabled: 0,
  disabled: 0,
  suppressed_per_time_period: 0,
  suppressed_per_rule_execution: 0,
  suppressed_fields_count: {
    one: 0,
    two: 0,
    three: 0,
  },
  suppresses_missing_fields: 0,
  does_not_suppress_missing_fields: 0,
};

/**
 * Default detection rule usage count, split by type + elastic/custom
 */
export const getInitialRulesUsage = (): RulesTypeUsage => ({
  query: {
    enabled: 0,
    disabled: 0,
    alerts: 0,
    cases: 0,
    legacy_notifications_enabled: 0,
    legacy_notifications_disabled: 0,
    notifications_enabled: 0,
    notifications_disabled: 0,
    legacy_investigation_fields: 0,
    alert_suppression: initialAlertSuppression,
  },
  threshold: {
    enabled: 0,
    disabled: 0,
    alerts: 0,
    cases: 0,
    legacy_notifications_enabled: 0,
    legacy_notifications_disabled: 0,
    notifications_enabled: 0,
    notifications_disabled: 0,
    legacy_investigation_fields: 0,
    alert_suppression: initialAlertSuppression,
  },
  eql: {
    enabled: 0,
    disabled: 0,
    alerts: 0,
    cases: 0,
    legacy_notifications_enabled: 0,
    legacy_notifications_disabled: 0,
    notifications_enabled: 0,
    notifications_disabled: 0,
    legacy_investigation_fields: 0,
    alert_suppression: initialAlertSuppression,
  },
  machine_learning: {
    enabled: 0,
    disabled: 0,
    alerts: 0,
    cases: 0,
    legacy_notifications_enabled: 0,
    legacy_notifications_disabled: 0,
    notifications_enabled: 0,
    notifications_disabled: 0,
    legacy_investigation_fields: 0,
    alert_suppression: initialAlertSuppression,
  },
  threat_match: {
    enabled: 0,
    disabled: 0,
    alerts: 0,
    cases: 0,
    legacy_notifications_enabled: 0,
    legacy_notifications_disabled: 0,
    notifications_enabled: 0,
    notifications_disabled: 0,
    legacy_investigation_fields: 0,
    alert_suppression: initialAlertSuppression,
  },
  new_terms: {
    enabled: 0,
    disabled: 0,
    alerts: 0,
    cases: 0,
    legacy_notifications_enabled: 0,
    legacy_notifications_disabled: 0,
    notifications_enabled: 0,
    notifications_disabled: 0,
    legacy_investigation_fields: 0,
    alert_suppression: initialAlertSuppression,
  },
  esql: {
    enabled: 0,
    disabled: 0,
    alerts: 0,
    cases: 0,
    legacy_notifications_enabled: 0,
    legacy_notifications_disabled: 0,
    notifications_enabled: 0,
    notifications_disabled: 0,
    legacy_investigation_fields: 0,
    alert_suppression: initialAlertSuppression,
  },
  elastic_total: {
    enabled: 0,
    disabled: 0,
    alerts: 0,
    cases: 0,
    legacy_notifications_enabled: 0,
    legacy_notifications_disabled: 0,
    notifications_enabled: 0,
    notifications_disabled: 0,
    legacy_investigation_fields: 0,
    alert_suppression: initialAlertSuppression,
  },
  custom_total: {
    enabled: 0,
    disabled: 0,
    alerts: 0,
    cases: 0,
    legacy_notifications_enabled: 0,
    legacy_notifications_disabled: 0,
    notifications_enabled: 0,
    notifications_disabled: 0,
    legacy_investigation_fields: 0,
    alert_suppression: initialAlertSuppression,
  },
});

/**
 * Returns the initial usage of event logs specific to rules.
 * This returns them for all rules, custom rules, and "elastic_rules"/"immutable rules"/pre-packaged rules
 * @returns The initial event log usage
 */
export const getInitialEventLogUsage = (): EventLogStatusMetric => ({
  all_rules: getInitialSingleEventLogUsage(),
  custom_rules: getInitialSingleEventLogUsage(),
  elastic_rules: getInitialSingleEventLogUsage(),
});

/**
 * Returns the initial single event metric for a particular event log.
 * This returns the initial single event metric for either rules, custom rules, or "elastic_rules"/"immutable rules"/pre-packaged rules
 * @see getInitialEventLogUsage
 * @returns The initial event log usage for a single event metric.
 */
export const getInitialSingleEventLogUsage = (): SingleEventLogStatusMetric => ({
  eql: getInitialSingleEventMetric(),
  threat_match: getInitialSingleEventMetric(),
  machine_learning: getInitialSingleEventMetric(),
  query: getInitialSingleEventMetric(),
  saved_query: getInitialSingleEventMetric(),
  threshold: getInitialSingleEventMetric(),
  total: {
    failures: 0,
    partial_failures: 0,
    succeeded: 0,
  },
});

/**
 * Returns the initial single event metric.
 * This returns the initial single event metric for either rules, custom rules, or "elastic_rules"/"immutable rules"/pre-packaged rules
 * @see getInitialEventLogUsage
 * @returns The initial event log usage for a single event metric.
 */
export const getInitialSingleEventMetric = (): SingleEventMetric => ({
  failures: 0,
  top_failures: [],
  partial_failures: 0,
  top_partial_failures: [],
  succeeded: 0,
  index_duration: getInitialMaxAvgMin(),
  search_duration: getInitialMaxAvgMin(),
  enrichment_duration: getInitialMaxAvgMin(),
  gap_duration: getInitialMaxAvgMin(),
  gap_count: 0,
});

/**
 * Returns the max, avg, or min for an event.
 * This returns the max, avg, or min for a single event metric.
 * @see getInitialEventLogUsage
 * @returns The max, avg, or min.
 */
export const getInitialMaxAvgMin = (): MaxAvgMin => ({
  max: 0.0,
  avg: 0.0,
  min: 0.0,
});
