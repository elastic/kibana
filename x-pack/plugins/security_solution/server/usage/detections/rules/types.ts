/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface FeatureTypeUsage {
  enabled: number;
  disabled: number;
  alerts: number;
  cases: number;
  legacy_notifications_enabled: number;
  legacy_notifications_disabled: number;
  notifications_enabled: number;
  notifications_disabled: number;
}

export interface RulesTypeUsage {
  query: FeatureTypeUsage;
  threshold: FeatureTypeUsage;
  eql: FeatureTypeUsage;
  machine_learning: FeatureTypeUsage;
  threat_match: FeatureTypeUsage;
  elastic_total: FeatureTypeUsage;
  custom_total: FeatureTypeUsage;
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
  failed: number;
  top_failed: Top10Failure;
  partial_failure: number;
  top_partial_failure: Top10Failure;
  succeeded: number;
  index_duration: MaxAvgMin;
  search_duration: MaxAvgMin;
  gap_duration: MaxAvgMin;
  gap_count: number;
}

/**
 * This contains the single event log status metric
 * @see EventLogStatusMetric
 */
export interface SingleEventLogStatusMetric {
  eql: SingleEventMetric;
  indicator: SingleEventMetric;
  mlRule: SingleEventMetric;
  query: SingleEventMetric;
  savedQuery: SingleEventMetric;
  threshold: SingleEventMetric;
  total: {
    failed: number;
    partial_failure: number;
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

/**
 * This is used to get the top 10 failure messages
 * or top 10 partial failure messages from the metrics
 * @see EventLogStatusMetric
 */
export interface Top10Failure {
  '1'?: FailureMessage | undefined;
  '2'?: FailureMessage | undefined;
  '3'?: FailureMessage | undefined;
  '4'?: FailureMessage | undefined;
  '5'?: FailureMessage | undefined;
  '6'?: FailureMessage | undefined;
  '7'?: FailureMessage | undefined;
  '8'?: FailureMessage | undefined;
  '9'?: FailureMessage | undefined;
  '10'?: FailureMessage | undefined;
}
