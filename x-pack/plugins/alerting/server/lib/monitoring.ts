/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Logger } from '@kbn/core/server';
import { RuleMonitoring, RawRuleMonitoring } from '../types';

export const INITIAL_METRICS = {
  duration: 0,
  total_search_duration_ms: null,
  total_indexing_duration_ms: null,
  total_alerts_detected: null,
  total_alerts_created: null,
  gap_duration_s: null,
};

export const getDefaultMonitoring = (timestamp: string) => {
  return {
    run: {
      history: [],
      calculated_metrics: {
        success_ratio: 0,
      },
      last_run: {
        timestamp,
        metrics: INITIAL_METRICS,
      },
    },
  };
};

// Immutably updates the monitoring object with timestamp and duration.
// Used when converting from and between raw monitoring object
export const updateMonitoring = ({
  monitoring,
  timestamp,
  duration,
}: {
  monitoring: RuleMonitoring;
  timestamp: string;
  duration: number;
}) => {
  const { run } = monitoring;
  const { last_run: lastRun, ...rest } = run;
  const { metrics = INITIAL_METRICS } = lastRun;

  return {
    run: {
      last_run: {
        timestamp,
        metrics: {
          ...metrics,
          duration,
        },
      },
      ...rest,
    },
  };
};

export const convertMonitoringFromRawAndVerify = (
  logger: Logger,
  ruleId: string,
  monitoring: RawRuleMonitoring
): RuleMonitoring | undefined => {
  if (!monitoring) {
    return undefined;
  }

  const lastRunDate = monitoring.run.last_run.timestamp;

  let parsedDateMillis = lastRunDate ? Date.parse(lastRunDate) : Date.now();
  if (isNaN(parsedDateMillis)) {
    logger.debug(`invalid monitoring last_run.timestamp "${lastRunDate}" in raw rule ${ruleId}`);
    parsedDateMillis = Date.now();
  }

  return updateMonitoring({
    monitoring,
    timestamp: new Date(parsedDateMillis).toISOString(),
    duration: monitoring.run.last_run.metrics.duration || 0,
  });
};
