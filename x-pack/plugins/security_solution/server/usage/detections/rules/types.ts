/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface AlertSuppressionUsage {
  enabled: number;
  disabled: number;
  suppressed_fields_count: {
    one: number;
    two: number;
    three: number;
  };
  suppressed_per_time_period: number;
  suppressed_per_rule_execution: number;
  suppresses_missing_fields: number;
  does_not_suppress_missing_fields: number;
}

export interface FeatureTypeUsage {
  enabled: number;
  disabled: number;
  alerts: number;
  cases: number;
  legacy_notifications_enabled: number;
  legacy_notifications_disabled: number;
  notifications_enabled: number;
  notifications_disabled: number;
  legacy_investigation_fields: number;
  alert_suppression: AlertSuppressionUsage;
}

export interface RulesTypeUsage {
  query: FeatureTypeUsage;
  threshold: FeatureTypeUsage;
  eql: FeatureTypeUsage;
  machine_learning: FeatureTypeUsage;
  threat_match: FeatureTypeUsage;
  new_terms: FeatureTypeUsage;
  elastic_total: FeatureTypeUsage;
  custom_total: FeatureTypeUsage;
  esql: FeatureTypeUsage;
}

export interface RuleAdoption {
  detection_rule_detail: RuleMetric[];
  detection_rule_usage: RulesTypeUsage;
  detection_rule_status: EventLogStatusMetric;
}

export interface RuleMetric {
  rule_name: string;
  rule_id: string;
  rule_type: string;
  rule_version: number;
  enabled: boolean;
  elastic_rule: boolean;
  created_on: string;
  updated_on: string;
  alert_count_daily: number;
  cases_count_total: number;
  has_legacy_notification: boolean;
  has_notification: boolean;
  has_legacy_investigation_field: boolean;
  has_alert_suppression_per_rule_execution: boolean;
  has_alert_suppression_per_time_period: boolean;
  has_alert_suppression_missing_fields_strategy_do_not_suppress: boolean;
  alert_suppression_fields_count: number;
}

/**
 * All the metrics for
 *   - all_rules, All the rules which includes "custom" and "elastic rules"/"immutable"/"pre-packaged"
 *   - custom_rules, All the rules which are _not_ "elastic rules"/"immutable"/"pre-packaged", thus custom rules
 *   - elastic_rules, All the "elastic rules"/"immutable"/"pre-packaged"
 * @see get_event_log_by_type_and_status
 */
export interface EventLogStatusMetric {
  all_rules: SingleEventLogStatusMetric;
  custom_rules: SingleEventLogStatusMetric;
  elastic_rules: SingleEventLogStatusMetric;
}

/**
 * Simple max, avg, min interface.
 * @see SingleEventMetric
 * @see EventLogStatusMetric
 */
export interface MaxAvgMin {
  max: number;
  avg: number;
  min: number;
}

/**
 * Single event metric and how many failures, succeeded, index, durations.
 * @see SingleEventLogStatusMetric
 * @see EventLogStatusMetric
 */
export interface SingleEventMetric {
  failures: number;
  top_failures: FailureMessage[];
  partial_failures: number;
  top_partial_failures: FailureMessage[];
  succeeded: number;
  index_duration: MaxAvgMin;
  search_duration: MaxAvgMin;
  enrichment_duration: MaxAvgMin;
  gap_duration: MaxAvgMin;
  gap_count: number;
}

/**
 * This contains the single event log status metric
 * @see EventLogStatusMetric
 */
export interface SingleEventLogStatusMetric {
  eql: SingleEventMetric;
  threat_match: SingleEventMetric;
  machine_learning: SingleEventMetric;
  query: SingleEventMetric;
  saved_query: SingleEventMetric;
  threshold: SingleEventMetric;
  total: {
    failures: number;
    partial_failures: number;
    succeeded: number;
  };
}

/**
 * This is the format for a failure message which is the message
 * and a count of how many rules had that failure message.
 * @see EventLogStatusMetric
 */
export interface FailureMessage {
  message: string;
  count: number;
}
