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

export const getInitialEventLogUsage = (): EventLogStatusMetric => ({
  all_rules: getInitialSingleEventLogUsage(),
  custom_rules: getInitialSingleEventLogUsage(),
  elastic_rules: getInitialSingleEventLogUsage(),
});

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

export const getInitialSingleEventMetric = (): SingleEventMetric => ({
  failed: 0,
  top_failed: {},
  partial_failure: 0,
  top_partial_failure: {},
  succeeded: 0,
  index_duration: getInitialMaxAvgMin(),
  search_duration: getInitialMaxAvgMin(),
  gap_duration: getInitialMaxAvgMin(),
  gap_count: 0,
});

export const getInitialMaxAvgMin = (): MaxAvgMin => ({
  max: 0.0,
  avg: 0.0,
  min: 0.0,
});
