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
} from './types';

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
  indicator: getInitialSingleEventMetric(),
  mlRule: getInitialSingleEventMetric(),
  query: getInitialSingleEventMetric(),
  savedQuery: getInitialSingleEventMetric(),
  threshold: getInitialSingleEventMetric(),
  total: {
    failed: 0,
    partial_failure: 0,
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
  failed: 0,
  top_failed: [],
  partial_failure: 0,
  top_partial_failure: [],
  succeeded: 0,
  index_duration: getInitialMaxAvgMin(),
  search_duration: getInitialMaxAvgMin(),
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
