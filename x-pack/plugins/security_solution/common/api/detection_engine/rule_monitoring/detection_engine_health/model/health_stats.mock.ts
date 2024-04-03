/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AggregatedMetric,
  HealthOverviewStats,
  HealthOverviewState,
  TotalEnabledDisabled,
} from './health_stats';

const getEmptyHealthOverviewState = (): HealthOverviewState => {
  return {
    number_of_rules: {
      all: getZeroTotalEnabledDisabled(),
      by_origin: {
        prebuilt: getZeroTotalEnabledDisabled(),
        custom: getZeroTotalEnabledDisabled(),
      },
      by_type: {},
      by_outcome: {},
    },
  };
};

const getZeroTotalEnabledDisabled = (): TotalEnabledDisabled => {
  return {
    total: 0,
    enabled: 0,
    disabled: 0,
  };
};

const getEmptyHealthOverviewStats = (): HealthOverviewStats => {
  return {
    number_of_executions: {
      total: 0,
      by_outcome: {
        succeeded: 0,
        warning: 0,
        failed: 0,
      },
    },
    number_of_logged_messages: {
      total: 0,
      by_level: {
        error: 0,
        warn: 0,
        info: 0,
        debug: 0,
        trace: 0,
      },
    },
    number_of_detected_gaps: {
      total: 0,
      total_duration_s: 0,
    },
    schedule_delay_ms: getZeroAggregatedMetric(),
    execution_duration_ms: getZeroAggregatedMetric(),
    search_duration_ms: getZeroAggregatedMetric(),
    indexing_duration_ms: getZeroAggregatedMetric(),
    top_errors: [],
    top_warnings: [],
  };
};

const getZeroAggregatedMetric = (): AggregatedMetric<number> => {
  return {
    percentiles: {
      '50.0': 0,
      '95.0': 0,
      '99.0': 0,
      '99.9': 0,
    },
  };
};

export const healthStatsMock = {
  getEmptyHealthOverviewState,
  getEmptyHealthOverviewStats,
};
