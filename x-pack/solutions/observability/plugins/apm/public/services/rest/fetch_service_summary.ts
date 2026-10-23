/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getBucketSize,
  getPreferredBucketSizeAndDataSource,
} from '@kbn/apm-data-access-plugin/common';
import type {
  ObservabilityTracesServiceSummaryData,
  ObservabilityTracesServiceSummaryMetric,
  ObservabilityTracesServiceSummarySlo,
} from '@kbn/discover-shared-plugin/public';
import type { Coordinate, SloStatus } from '@kbn/apm-types';
import { SLO_STATUS_PRIORITY } from '@kbn/apm-types';
import { ApmDocumentType } from '../../../common/document_type';
import { ENVIRONMENT_ALL_VALUE } from '../../../common/environment_filter_values';
import {
  asMillisecondDuration,
  asPercent,
  asTransactionRate,
} from '../../../common/utils/formatters';
import { getApmInternalServices } from '../../plugin';

// Spark plots render ~20 buckets; keep the series resolution consistent with the APM UI.
const NUM_BUCKETS = 20;

type SeriesPoint = ObservabilityTracesServiceSummaryMetric['series'][number];

const average = (series: SeriesPoint[]): number | null => {
  const values = series
    .map(({ y }) => y)
    .filter((y): y is number => typeof y === 'number' && Number.isFinite(y));
  if (values.length === 0) {
    return null;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const toMetric = (
  coordinates: Coordinate[],
  format: (value: number | null) => string
): ObservabilityTracesServiceSummaryMetric => {
  const series = coordinates.map(({ x, y }) => ({ x, y: y ?? null }));
  return { series, valueLabel: format(average(series)) };
};

// Collapse the per-status SLO counts into the single worst status (and how many SLOs share it),
// mirroring the APM service flyout badge. `noSLOs` means the service has none defined.
const toSlo = (
  response: { total: number; statusCounts?: Partial<Record<SloStatus, number>> } | undefined
): ObservabilityTracesServiceSummarySlo | undefined => {
  if (!response) {
    return undefined;
  }
  const { total, statusCounts } = response;
  if (total === 0 || !statusCounts) {
    return { status: 'noSLOs', count: 0, total: 0 };
  }
  for (const status of SLO_STATUS_PRIORITY) {
    const count = statusCounts[status] ?? 0;
    if (count > 0) {
      return { status, count, total };
    }
  }
  return { status: 'noSLOs', count: 0, total };
};

// `getPreferredBucketSizeAndDataSource` returns the broad `ApmDocumentType`, but the sources are
// pre-filtered to transaction types (with a transaction-event fallback), so narrowing is safe.
const toTransactionDocumentType = (
  documentType: ApmDocumentType
): ApmDocumentType.TransactionMetric | ApmDocumentType.TransactionEvent =>
  documentType === ApmDocumentType.TransactionMetric
    ? ApmDocumentType.TransactionMetric
    : ApmDocumentType.TransactionEvent;

export const fetchServiceSummary = async (
  {
    serviceName,
    environment,
    start,
    end,
  }: {
    serviceName: string;
    environment?: string;
    start: string;
    end: string;
  },
  signal: AbortSignal
): Promise<Omit<ObservabilityTracesServiceSummaryData, 'links'>> => {
  const { callApmApi } = getApmInternalServices();
  const resolvedEnvironment = environment || ENVIRONMENT_ALL_VALUE;

  // Resolve the preferred data source + bucket size, mirroring usePreferredDataSourceAndBucketSize.
  const { sources } = await callApmApi('GET /internal/apm/time_range_metadata', {
    params: { query: { start, end, kuery: '', useSpanName: false } },
    signal,
  });

  const suitableTypes = [ApmDocumentType.TransactionMetric, ApmDocumentType.TransactionEvent];
  const { bucketSizeInSeconds, source } = getPreferredBucketSizeAndDataSource({
    sources: sources.filter(({ documentType }) => suitableTypes.includes(documentType)),
    bucketSizeInSeconds: getBucketSize({
      numBuckets: NUM_BUCKETS,
      start: new Date(start).getTime(),
      end: new Date(end).getTime(),
    }).bucketSize,
  });

  const [statistics, alerts, slo] = await Promise.all([
    callApmApi('POST /internal/apm/services/detailed_statistics', {
      params: {
        query: {
          environment: resolvedEnvironment,
          kuery: '',
          start,
          end,
          probability: 1,
          documentType: toTransactionDocumentType(source.documentType),
          rollupInterval: source.rollupInterval,
          bucketSizeInSeconds,
        },
        body: { serviceNames: JSON.stringify([serviceName]) },
      },
      signal,
    }),
    // Active-alert counts must not use the APM client LRU cache: when end < now, cached snapshots
    // diverge across surfaces. A failure here (e.g. missing privilege) should not break the summary.
    callApmApi('GET /internal/apm/services/{serviceName}/alerts_count', {
      isCachable: false,
      params: { path: { serviceName }, query: { start, end, environment: resolvedEnvironment } },
      signal,
    }).catch((): { alertsCount?: number } => ({})),
    // SLO status for the service. A failure (e.g. the user cannot read SLOs) just omits the badge.
    callApmApi('GET /internal/apm/services/{serviceName}/slos', {
      params: {
        path: { serviceName },
        query: { environment: resolvedEnvironment, page: 0, perPage: 1 },
      },
      signal,
    }).catch(() => undefined),
  ]);

  const current = statistics.currentPeriod[serviceName];

  return {
    latency: toMetric(current?.latency ?? [], asMillisecondDuration),
    throughput: toMetric(current?.throughput ?? [], asTransactionRate),
    failedTransactionRate: toMetric(current?.transactionErrorRate ?? [], (value) =>
      asPercent(value, 1)
    ),
    activeAlertCount: alerts.alertsCount,
    slo: toSlo(slo),
  };
};
