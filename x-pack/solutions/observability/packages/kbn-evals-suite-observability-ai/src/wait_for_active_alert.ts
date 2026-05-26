/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { KbnClient } from '@kbn/kbn-client';
import type { ToolingLog } from '@kbn/tooling-log';

const DEFAULT_TIMEOUT_MS = 90_000;
const DEFAULT_POLL_INTERVAL_MS = 3_000;
const INDEX_REFRESH_WAIT_MS = 2_500;

export interface WaitForActiveAlertDiagnostics {
  scenarioId?: string;
  ruleTypeId: string;
  serviceName?: string;
  windowSize?: number;
  windowUnit?: string;
}

interface WaitForActiveAlertParams {
  esClient: Client;
  kbnClient: KbnClient;
  alertsIndex: string;
  ruleId: string;
  log: ToolingLog;
  timeoutMs?: number;
  pollIntervalMs?: number;
  diagnostics?: WaitForActiveAlertDiagnostics;
}

interface RuleExecutionStatusResponse {
  status?: string;
  last_execution_date?: string;
  error?: { reason?: string; message?: string };
}

interface RuleLastRunResponse {
  outcome?: string;
  warning?: string | null;
  outcome_msg?: string | null;
}

interface RuleGetResponse {
  execution_status?: RuleExecutionStatusResponse;
  last_run?: RuleLastRunResponse;
}

interface ExecutionLogEntry {
  status?: string;
  message?: string;
  error?: { message?: string };
}

interface ExecutionLogResponse {
  data?: ExecutionLogEntry[];
}

export async function waitForActiveAlert({
  esClient,
  kbnClient,
  alertsIndex,
  ruleId,
  log,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  pollIntervalMs = DEFAULT_POLL_INTERVAL_MS,
  diagnostics,
}: WaitForActiveAlertParams): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  let attempt = 0;

  while (Date.now() < deadline) {
    attempt += 1;

    if (attempt > 1 && attempt % 2 === 0) {
      log.info(`Re-triggering rule run (attempt ${attempt})`);
      await kbnClient.request<void>({
        method: 'POST',
        path: `/internal/alerting/rule/${ruleId}/_run_soon`,
      });
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    await esClient.indices.refresh({ index: alertsIndex });
    await new Promise((resolve) => setTimeout(resolve, INDEX_REFRESH_WAIT_MS));

    const alertsResponse = await esClient.search({
      index: alertsIndex,
      query: {
        bool: {
          filter: [
            { term: { 'kibana.alert.rule.uuid': ruleId } },
            { term: { 'kibana.alert.status': 'active' } },
          ],
        },
      },
      size: 1,
    });

    const alertDoc = alertsResponse.hits.hits[0];
    if (alertDoc?._id) {
      log.info(`Found active alert with ID: ${alertDoc._id} (attempt ${attempt})`);
      return alertDoc._id;
    }

    log.debug(`No active alert yet for rule ${ruleId} (attempt ${attempt})`);
  }

  const diagnosticLines = await collectTimeoutDiagnostics({
    esClient,
    kbnClient,
    alertsIndex,
    ruleId,
    timeoutMs,
    diagnostics,
  });

  for (const line of diagnosticLines) {
    log.error(line);
  }

  const diagnosticBlock =
    diagnosticLines.length > 0
      ? `\nDiagnostics:\n${diagnosticLines.map((l) => `  - ${l}`).join('\n')}`
      : '';

  throw new Error(
    `No active alert found for rule ${ruleId} in index ${alertsIndex} after ${timeoutMs}ms${diagnosticBlock}`
  );
}

async function collectTimeoutDiagnostics({
  esClient,
  kbnClient,
  alertsIndex,
  ruleId,
  timeoutMs,
  diagnostics,
}: {
  esClient: Client;
  kbnClient: KbnClient;
  alertsIndex: string;
  ruleId: string;
  timeoutMs: number;
  diagnostics?: WaitForActiveAlertDiagnostics;
}): Promise<string[]> {
  const lines: string[] = [];

  if (diagnostics?.scenarioId) {
    lines.push(`scenario: ${diagnostics.scenarioId}`);
  }
  if (diagnostics?.ruleTypeId) {
    lines.push(`rule_type: ${diagnostics.ruleTypeId}`);
  }

  await appendRuleDiagnostics({ kbnClient, ruleId, timeoutMs, lines });

  await appendAlertDiagnostics({ esClient, alertsIndex, ruleId, lines });

  if (diagnostics?.serviceName) {
    await appendApmDataDiagnostics({ esClient, diagnostics, lines });
  }

  return lines;
}

async function appendRuleDiagnostics({
  kbnClient,
  ruleId,
  timeoutMs,
  lines,
}: {
  kbnClient: KbnClient;
  ruleId: string;
  timeoutMs: number;
  lines: string[];
}): Promise<void> {
  try {
    const ruleResponse = await kbnClient.request<RuleGetResponse>({
      method: 'GET',
      path: `/api/alerting/rule/${ruleId}`,
    });
    const { execution_status: executionStatus, last_run: lastRun } = ruleResponse.data;

    if (executionStatus) {
      const parts = [
        executionStatus.status ? `status=${executionStatus.status}` : undefined,
        executionStatus.last_execution_date
          ? `last_execution=${executionStatus.last_execution_date}`
          : undefined,
        executionStatus.error?.message
          ? `error=${executionStatus.error.message}`
          : executionStatus.error?.reason
          ? `error=${executionStatus.error.reason}`
          : undefined,
      ].filter(Boolean);
      lines.push(`rule execution: ${parts.join(', ') || 'unknown'}`);
    }

    if (lastRun) {
      const parts = [
        lastRun.outcome ? `outcome=${lastRun.outcome}` : undefined,
        lastRun.outcome_msg ? `message=${lastRun.outcome_msg}` : undefined,
        lastRun.warning ? `warning=${lastRun.warning}` : undefined,
      ].filter(Boolean);
      lines.push(`rule last_run: ${parts.join(', ') || 'unknown'}`);
    }
  } catch (error) {
    lines.push(`rule execution: failed to fetch rule (${formatErrorMessage(error)})`);
  }

  try {
    const dateStart = new Date(Date.now() - timeoutMs).toISOString();
    const logResponse = await kbnClient.request<ExecutionLogResponse>({
      method: 'GET',
      path: `/internal/alerting/rule/${ruleId}/_execution_log`,
      query: {
        date_start: dateStart,
        per_page: 5,
      },
    });
    const entries = logResponse.data.data ?? [];
    if (entries.length === 0) {
      lines.push('rule execution log: no entries in wait window');
    } else {
      const summary = entries
        .map((entry, index) => {
          const status = entry.status ?? 'unknown';
          const detail = entry.error?.message ?? entry.message;
          return detail ? `${index + 1}:${status} (${detail})` : `${index + 1}:${status}`;
        })
        .join('; ');
      lines.push(`rule execution log (recent): ${summary}`);
    }
  } catch (error) {
    lines.push(`rule execution log: failed to fetch (${formatErrorMessage(error)})`);
  }
}

async function appendAlertDiagnostics({
  esClient,
  alertsIndex,
  ruleId,
  lines,
}: {
  esClient: Client;
  alertsIndex: string;
  ruleId: string;
  lines: string[];
}): Promise<void> {
  try {
    const alertsResponse = await esClient.search({
      index: alertsIndex,
      size: 0,
      query: { term: { 'kibana.alert.rule.uuid': ruleId } },
      aggs: {
        by_status: { terms: { field: 'kibana.alert.status', size: 10 } },
      },
    });

    const statusBuckets = alertsResponse.aggregations?.by_status as
      | { buckets?: Array<{ key: string; doc_count: number }> }
      | undefined;

    if (!statusBuckets?.buckets?.length) {
      lines.push(`alerts for rule: none in ${alertsIndex}`);
      return;
    }

    const statusSummary = statusBuckets.buckets
      .map((bucket) => `${bucket.key}=${bucket.doc_count}`)
      .join(', ');
    lines.push(`alerts for rule (by status): ${statusSummary}`);
  } catch (error) {
    lines.push(`alerts for rule: failed to query (${formatErrorMessage(error)})`);
  }
}

async function appendApmDataDiagnostics({
  esClient,
  diagnostics,
  lines,
}: {
  esClient: Client;
  diagnostics: WaitForActiveAlertDiagnostics;
  lines: string[];
}): Promise<void> {
  const serviceName = diagnostics.serviceName!;
  const timeGte = buildTimeRangeGte(diagnostics.windowSize, diagnostics.windowUnit);
  const timeFilter = { range: { '@timestamp': { gte: timeGte, lte: 'now' } } };
  const serviceFilter = { term: { 'service.name': serviceName } };

  const isTransactionDurationRule = diagnostics.ruleTypeId === 'apm.transaction_duration';
  const isErrorRateRule = diagnostics.ruleTypeId === 'apm.error_rate';

  if (isTransactionDurationRule) {
    const metricCount = await safeCount(esClient, {
      index: 'metrics-*,metrics-apm*',
      query: {
        bool: {
          filter: [timeFilter, serviceFilter],
        },
      },
    });
    lines.push(
      `APM metrics docs for service "${serviceName}" in ${timeGte}..now: ${metricCount} (transaction duration rules query aggregated transaction metrics)`
    );

    const transactionCount = await safeCount(esClient, {
      index: 'traces-*,traces-apm*',
      query: {
        bool: {
          filter: [timeFilter, serviceFilter, { term: { 'processor.event': 'transaction' } }],
        },
      },
    });
    lines.push(
      `APM transaction events for service "${serviceName}" in ${timeGte}..now: ${transactionCount}`
    );

    if (metricCount === 0 && transactionCount === 0) {
      lines.push(
        'likely cause: no APM latency data for this service in the rule time window (check snapshot replay and service.name)'
      );
    }
  }

  if (isErrorRateRule) {
    const errorCount = await safeCount(esClient, {
      index: 'traces-*,traces-apm*',
      query: {
        bool: {
          filter: [timeFilter, serviceFilter, { term: { 'processor.event': 'error' } }],
        },
      },
    });
    lines.push(
      `APM error events for service "${serviceName}" in ${timeGte}..now: ${errorCount} (error rate rules query the error index)`
    );

    if (errorCount === 0) {
      lines.push(
        'likely cause: no APM error events for this service in the rule time window (check snapshot replay and service.name)'
      );
    }
  }
}

function buildTimeRangeGte(windowSize?: number, windowUnit?: string): string {
  if (windowSize !== undefined && windowUnit) {
    return `now-${windowSize}${windowUnit}`;
  }
  return 'now-5m';
}

async function safeCount(
  esClient: Client,
  params: { index: string; query: Record<string, unknown> }
): Promise<number> {
  try {
    const response = await esClient.count({
      index: params.index,
      query: params.query,
    });
    return response.count;
  } catch {
    return -1;
  }
}

function formatErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
