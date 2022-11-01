/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/core/server';
import stats from 'stats-lite';
import { RuleMonitoring, RawRuleMonitoring } from '../types';
import { RuleTaskStateAndMetrics } from '../task_runner/types';
import { isOk, Result } from './result_type';

export const INITIAL_METRICS = {
  duration: 0,
  total_search_duration_ms: null,
  total_indexing_duration_ms: null,
  total_alerts_detected: null,
  total_alerts_created: null,
  gap_duration_s: null,
};

export const getExecutionSuccessRatio = (ruleMonitoring: RuleMonitoring) => {
  const { history } = ruleMonitoring.run;
  return history.filter(({ success }) => success).length / history.length;
};

export const getExecutionDurationPercentiles = (ruleMonitoring: RuleMonitoring) => {
  const durationSamples = ruleMonitoring.run.history.reduce<number[]>((duration, history) => {
    if (typeof history.duration === 'number') {
      return [...duration, history.duration];
    }
    return duration;
  }, []);

  if (durationSamples.length) {
    return {
      p50: stats.percentile(durationSamples as number[], 0.5),
      p95: stats.percentile(durationSamples as number[], 0.95),
      p99: stats.percentile(durationSamples as number[], 0.99),
    };
  }

  return {};
};

export const getLastRunDurationMetrics = (
  stateWithMetrics: Result<RuleTaskStateAndMetrics, Error>
) => {
  if (isOk(stateWithMetrics)) {
    // The only shared property between alerting and security is
    // total_search_duration_ms
    const { metrics } = stateWithMetrics.value;
    return {
      total_search_duration_ms: metrics.totalSearchDurationMs,
    };
  }
  return {};
};

type Timestamp<T> = T extends RuleMonitoring ? Date : T extends RawRuleMonitoring ? string : never;

export const getRuleMonitoringTemplate = <T extends RuleMonitoring | RawRuleMonitoring>(
  timestamp: Timestamp<T>
) => {
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

export const getDefaultRuleMonitoring = (timestamp: Date): RuleMonitoring => {
  return getRuleMonitoringTemplate<RuleMonitoring>(timestamp);
};

export const getDefaultRawRuleMonitoring = (timestamp: string): RawRuleMonitoring => {
  return getRuleMonitoringTemplate<RawRuleMonitoring>(timestamp);
};

// Immutably updates the monitoring object with timestamp and duration.
// Used when converting from and between raw monitoring object
export const updateMonitoring = <T extends RuleMonitoring | RawRuleMonitoring>({
  monitoring,
  timestamp,
  duration,
}: {
  monitoring: RuleMonitoring | RawRuleMonitoring;
  timestamp: Timestamp<T>;
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

export const monitoringToRaw = (monitoring: RuleMonitoring): RawRuleMonitoring => {
  return updateMonitoring<RawRuleMonitoring>({
    monitoring,
    timestamp: monitoring.run.last_run.timestamp.toISOString(),
    duration: monitoring.run.last_run.metrics.duration || 0,
  });
};

export const monitoringFromRaw = (monitoring: RawRuleMonitoring): RuleMonitoring => {
  return updateMonitoring<RuleMonitoring>({
    monitoring,
    timestamp: new Date(monitoring.run.last_run.timestamp),
    duration: monitoring.run.last_run.metrics.duration || 0,
  });
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

  return updateMonitoring<RuleMonitoring>({
    monitoring,
    timestamp: new Date(parsedDateMillis),
    duration: monitoring.run.last_run.metrics.duration || 0,
  });
};
