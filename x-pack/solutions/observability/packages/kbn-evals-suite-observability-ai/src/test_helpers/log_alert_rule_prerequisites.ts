/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import type { TransactionDurationRuleParams } from '@kbn/response-ops-rule-params/transaction_duration';

const TRACES_INDEX = 'traces-apm*,apm-*-traces-*';
const METRICS_INDEX = 'metrics-apm*,apm-*-metrics-*';

export interface LogTransactionDurationAlertPrerequisitesOptions {
  esClient: Client;
  log: ToolingLog;
  ruleParams: TransactionDurationRuleParams;
  ruleId?: string;
  alertsIndex?: string;
  /** Indices created by snapshot replay (for logging only). */
  replayedIndices?: string[];
}

interface WindowStats {
  docCount: number;
  p95Microseconds: number | null;
  maxTimestamp: string | null;
}

/**
 * Logs ES data that mirrors what `apm.transaction_duration` evaluates (traces vs metrics paths).
 * Intended for CI/local debugging when `waitForActiveAlert` times out.
 */
export async function logTransactionDurationAlertPrerequisites({
  esClient,
  log,
  ruleParams,
  ruleId,
  alertsIndex,
  replayedIndices,
}: LogTransactionDurationAlertPrerequisitesOptions): Promise<void> {
  const window = `${ruleParams.windowSize}${ruleParams.windowUnit}`;
  const thresholdMs = ruleParams.threshold;
  const thresholdMicroseconds = thresholdMs * 1000;
  const serviceName = ruleParams.serviceName ?? '(any)';
  const aggregationLabel =
    ruleParams.aggregationType === 'avg' ? 'avg (us)' : `p95 (${ruleParams.aggregationType})`;

  log.info(
    `[alert-prereq] Rule expects ${aggregationLabel} > ${thresholdMs} ms (${thresholdMicroseconds} µs) ` +
      `for service.name="${serviceName}" in @timestamp >= now-${window}. ` +
      `APM rules use traces when Kibana has xpack.apm.searchAggregatedTransactions=never, otherwise metrics rollups.`
  );

  if (replayedIndices?.length) {
    log.info(
      `[alert-prereq] Replayed indices (${replayedIndices.length}): ${replayedIndices.join(', ')}`
    );
  }

  const [tracesRuleWindow, tracesWideWindow, metricsRuleWindow, metricsWideWindow] =
    await Promise.all([
      queryTraceLatencyStats(esClient, serviceName, window, ruleParams.aggregationType),
      queryTraceLatencyStats(esClient, serviceName, '30m', ruleParams.aggregationType),
      queryMetricLatencyStats(esClient, serviceName, window, ruleParams.aggregationType),
      queryMetricLatencyStats(esClient, serviceName, '30m', ruleParams.aggregationType),
    ]);

  logWindowStats(
    log,
    'traces (rule path when searchAggregatedTransactions=never)',
    window,
    tracesRuleWindow,
    {
      thresholdMicroseconds,
      aggregationType: ruleParams.aggregationType,
    }
  );
  logWindowStats(log, 'traces (wider sanity check)', '30m', tracesWideWindow, {
    thresholdMicroseconds,
    aggregationType: ruleParams.aggregationType,
  });
  logWindowStats(
    log,
    'metrics rollups (rule path when searchAggregatedTransactions≠never)',
    window,
    metricsRuleWindow,
    {
      thresholdMicroseconds,
      aggregationType: ruleParams.aggregationType,
    }
  );
  logWindowStats(log, 'metrics rollups (wider sanity check)', '30m', metricsWideWindow, {
    thresholdMicroseconds,
    aggregationType: ruleParams.aggregationType,
  });

  if (tracesRuleWindow.docCount === 0 && tracesWideWindow.docCount > 0) {
    log.warning(
      `[alert-prereq] No "${serviceName}" traces in now-${window} but ${tracesWideWindow.docCount} in now-30m. ` +
        `Replay aligns snapshot max→now; the rule window only sees the last ${window} of the recording (often empty after ad stops).`
    );
  }

  if (metricsRuleWindow.p95Microseconds === null && metricsRuleWindow.docCount > 0) {
    log.warning(
      `[alert-prereq] Metrics docs exist but latency percentile is null (common for OTel rollup histograms). ` +
        `Use Scout evals_tracing with --xpack.apm.searchAggregatedTransactions=never.`
    );
  }

  if (ruleId && alertsIndex) {
    await logAlertsForRule(esClient, log, alertsIndex, ruleId);
  }
}

function logWindowStats(
  log: ToolingLog,
  label: string,
  window: string,
  stats: WindowStats,
  {
    thresholdMicroseconds,
    aggregationType,
  }: {
    thresholdMicroseconds: number;
    aggregationType: TransactionDurationRuleParams['aggregationType'];
  }
): void {
  const latencyMs =
    stats.p95Microseconds === null ? null : Math.round(stats.p95Microseconds / 1000);
  const wouldBreach =
    stats.p95Microseconds !== null && stats.p95Microseconds > thresholdMicroseconds;

  log.info(
    `[alert-prereq] ${label} @ now-${window}: docCount=${stats.docCount}, ` +
      `${aggregationType === 'avg' ? 'avg' : 'p95'}=${
        latencyMs === null ? 'null' : `${latencyMs} ms`
      }, ` +
      `max @timestamp=${stats.maxTimestamp ?? 'n/a'}, wouldBreach=${wouldBreach}`
  );
}

async function queryTraceLatencyStats(
  esClient: Client,
  serviceName: string,
  window: string,
  aggregationType: TransactionDurationRuleParams['aggregationType']
): Promise<WindowStats> {
  return queryLatencyStats({
    esClient,
    index: TRACES_INDEX,
    serviceName,
    window,
    aggregationType,
    durationField: 'transaction.duration.us',
    extraFilters: [{ bool: { must_not: { exists: { field: 'parent.id' } } } }],
  });
}

async function queryMetricLatencyStats(
  esClient: Client,
  serviceName: string,
  window: string,
  aggregationType: TransactionDurationRuleParams['aggregationType']
): Promise<WindowStats> {
  return queryLatencyStats({
    esClient,
    index: METRICS_INDEX,
    serviceName,
    window,
    aggregationType,
    durationField: 'transaction.duration.histogram',
    extraFilters: [
      { term: { 'processor.event': 'metric' } },
      { term: { 'metricset.name': 'transaction' } },
    ],
  });
}

async function queryLatencyStats({
  esClient,
  index,
  serviceName,
  window,
  aggregationType,
  durationField,
  extraFilters,
}: {
  esClient: Client;
  index: string;
  serviceName: string;
  window: string;
  aggregationType: TransactionDurationRuleParams['aggregationType'];
  durationField: string;
  extraFilters: Array<Record<string, unknown>>;
}): Promise<WindowStats> {
  try {
    const response = await esClient.search({
      index,
      size: 0,
      ignore_unavailable: true,
      query: {
        bool: {
          filter: [
            { range: { '@timestamp': { gte: `now-${window}` } } },
            { term: { 'service.name': serviceName } },
            ...extraFilters,
          ],
        },
      },
      aggs: {
        latency:
          aggregationType === 'avg'
            ? { avg: { field: durationField } }
            : { percentiles: { field: durationField, percents: [95] } },
        max_ts: { max: { field: '@timestamp' } },
      },
    });

    const docCount =
      typeof response.hits.total === 'number'
        ? response.hits.total
        : response.hits.total?.value ?? 0;

    let p95Microseconds: number | null = null;
    const latencyAgg = response.aggregations?.latency as
      | { value?: number | null; values?: Record<string, number | null> }
      | undefined;

    if (aggregationType === 'avg') {
      p95Microseconds = latencyAgg?.value ?? null;
    } else {
      p95Microseconds = latencyAgg?.values?.['95.0'] ?? latencyAgg?.values?.['95'] ?? null;
    }

    const maxTimestamp =
      (response.aggregations?.max_ts as { value_as_string?: string; value?: number } | undefined)
        ?.value_as_string ?? null;

    return { docCount, p95Microseconds, maxTimestamp };
  } catch (error) {
    return {
      docCount: 0,
      p95Microseconds: null,
      maxTimestamp: `query failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

async function logAlertsForRule(
  esClient: Client,
  log: ToolingLog,
  alertsIndex: string,
  ruleId: string
): Promise<void> {
  try {
    const response = await esClient.search({
      index: alertsIndex,
      size: 5,
      query: { term: { 'kibana.alert.rule.uuid': ruleId } },
      aggs: {
        by_status: { terms: { field: 'kibana.alert.status', size: 10 } },
      },
    });

    const total =
      typeof response.hits.total === 'number'
        ? response.hits.total
        : response.hits.total?.value ?? 0;

    const statusBuckets =
      (response.aggregations?.by_status as { buckets?: Array<{ key: string; doc_count: number }> })
        ?.buckets ?? [];

    log.info(
      `[alert-prereq] Alerts for rule ${ruleId} in ${alertsIndex}: total=${total}, byStatus=${JSON.stringify(
        statusBuckets.map((b) => ({ status: b.key, count: b.doc_count }))
      )}`
    );
  } catch (error) {
    log.warning(
      `[alert-prereq] Could not query alerts index ${alertsIndex}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}
