/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import stats from 'stats-lite';
import { RawRuleMonitoring, RuleMonitoringHistory, RuleLastRunOutcomes } from '../types';
import { INITIAL_METRICS } from '../lib/monitoring';

export class RuleMonitoringService {
  private monitoring: RawRuleMonitoring = {
    run: {
      history: [],
      calculated_metrics: {
        success_ratio: 0,
      },
      last_run: {
        timestamp: new Date().toISOString(),
        metrics: INITIAL_METRICS,
      },
    },
  };

  public setLastRunMetricsDuration(duration: number) {
    this.monitoring.run.last_run.metrics.duration = duration;
  }

  public setLastRunTimestamp(timestamp: Date) {
    this.monitoring.run.last_run.timestamp = timestamp.toISOString();
  }

  public setMonitoring(monitoringFromSO: RawRuleMonitoring | undefined) {
    if (monitoringFromSO) {
      this.monitoring = monitoringFromSO;
    }
  }

  public setCalculatedMetrics(calculatedMetrics: RawRuleMonitoring['run']['calculated_metrics']) {
    this.monitoring.run.calculated_metrics = calculatedMetrics;
  }

  public setLastRunMetrics(metrics: RawRuleMonitoring['run']['last_run']['metrics']) {
    this.monitoring.run.last_run.metrics = metrics;
  }

  public getMonitoring() {
    return this.monitoring;
  }

  public addHistory({
    duration,
    outcome,
  }: {
    duration?: number;
    timestamp?: Date;
    outcome: RuleLastRunOutcomes;
  }) {
    const date = new Date();
    const monitoringHistory: RuleMonitoringHistory = {
      success: true,
      timestamp: date.getTime(),
      outcome,
    };
    if (duration) {
      monitoringHistory.duration = duration;
    }
    if (outcome === 'failed') {
      monitoringHistory.success = false;
    }
    this.setCalculatedMetrics({
      success_ratio: this.buildExecutionSuccessRatio(),
      ...this.buildExecutionDurationPercentiles(),
    });
    this.monitoring.run.history.push(monitoringHistory);
  }

  public getLastRunMetricsSetters() {
    return {
      setLastRunMetricsTotalSearchDurationMs:
        this.setLastRunMetricsTotalSearchDurationMs.bind(this),
      setLastRunMetricsTotalIndexingDurationMs:
        this.setLastRunMetricsTotalIndexingDurationMs.bind(this),
      setLastRunMetricsTotalAlertDetected: this.setLastRunMetricsTotalAlertDetected.bind(this),
      setLastRunMetricsTotalAlertCreated: this.setLastRunMetricsTotalAlertCreated.bind(this),
      setLastRunMetricsGapDurationS: this.setLastRunMetricsGapDurationS.bind(this),
    };
  }

  private setLastRunMetricsTotalSearchDurationMs(totalSearchDurationMs: number) {
    this.monitoring.run.last_run.metrics.total_search_duration_ms = totalSearchDurationMs;
  }

  private setLastRunMetricsTotalIndexingDurationMs(totalIndexingDurationMs: number) {
    this.monitoring.run.last_run.metrics.total_indexing_duration_ms = totalIndexingDurationMs;
  }

  private setLastRunMetricsTotalAlertDetected(totalAlertDetected: number) {
    this.monitoring.run.last_run.metrics.total_alerts_detected = totalAlertDetected;
  }

  private setLastRunMetricsTotalAlertCreated(totalAlertCreated: number) {
    this.monitoring.run.last_run.metrics.total_alerts_created = totalAlertCreated;
  }

  private setLastRunMetricsGapDurationS(gapDurationS: number) {
    this.monitoring.run.last_run.metrics.gap_duration_s = gapDurationS;
  }

  private buildExecutionSuccessRatio() {
    const { history } = this.monitoring.run;
    return history.filter(({ success }) => success).length / history.length;
  }

  private buildExecutionDurationPercentiles = () => {
    const { history } = this.monitoring.run;
    const durationSamples = history.reduce<number[]>((duration, historyItem) => {
      if (typeof historyItem.duration === 'number') {
        return [...duration, historyItem.duration];
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
}
