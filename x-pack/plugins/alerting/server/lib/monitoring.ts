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
        metrics: {
          duration: 0,
        },
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
  const { last_run: lastRun } = run;
  const { metrics = {} } = lastRun;

  return {
    run: {
      ...run,
      last_run: {
        ...lastRun,
        timestamp,
        metrics: {
          ...metrics,
          duration,
        },
      },
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

export const monitoringFromRaw = (
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
