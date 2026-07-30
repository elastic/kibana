/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LatencyAggregationType } from '../../../../../../common/latency_aggregation_types';
import { ChartType } from '../../../charts/helper/get_timeseries_color';
import { getChartDefinitions, getLatencyChartType } from '.';

const TRANSACTION_INDEXES = 'traces-apm*';
const SPAN_INDEXES = 'traces-apm*'; // same value as TRANSACTION_INDEXES in MOCK_INDICES
const METRIC_INDEXES = 'metrics-apm*';

const MOCK_INDICES = {
  transaction: TRANSACTION_INDEXES,
  metric: METRIC_INDEXES,
  span: SPAN_INDEXES,
  error: 'logs-apm*',
  onboarding: 'apm-*',
  sourcemap: 'apm-*',
};

function buildDefinitions(
  overrides: Partial<Parameters<typeof getChartDefinitions>[0]> = {}
): ReturnType<typeof getChartDefinitions> {
  return getChartDefinitions({
    indices: MOCK_INDICES,
    schema: 'ecs',
    serviceName: 'opbeans-java',
    environment: 'production',
    transactionType: 'request',
    latencyAggregationType: LatencyAggregationType.avg,
    ...overrides,
  });
}

describe('service flyout chart_configs', () => {
  describe('getLatencyChartType', () => {
    it('maps the aggregation type to the matching chart type', () => {
      expect(getLatencyChartType(LatencyAggregationType.p95)).toBe(ChartType.LATENCY_P95);
      expect(getLatencyChartType(LatencyAggregationType.p99)).toBe(ChartType.LATENCY_P99);
      expect(getLatencyChartType(LatencyAggregationType.avg)).toBe(ChartType.LATENCY_AVG);
    });
  });

  describe('getChartDefinitions', () => {
    it('returns RED key metrics and infrastructure metrics for APM ingestion', () => {
      const { keyMetrics, infrastructureMetrics } = buildDefinitions();

      expect(keyMetrics.map((c) => c.id)).toEqual([
        'latency',
        'failedTransactionRate',
        'throughput',
      ]);
      expect(infrastructureMetrics.map((c) => c.id)).toEqual(['cpuUsage', 'memoryUsage']);
    });

    it('returns the same chart IDs for OTel ingestion', () => {
      const { keyMetrics, infrastructureMetrics } = buildDefinitions({
        schema: 'otel',
      });

      expect(keyMetrics.map((c) => c.id)).toEqual([
        'latency',
        'failedTransactionRate',
        'throughput',
      ]);
      expect(infrastructureMetrics.map((c) => c.id)).toEqual(['cpuUsage', 'memoryUsage']);
    });

    it('scopes APM key metrics to the transaction index only', () => {
      const { keyMetrics } = buildDefinitions();

      keyMetrics.forEach(({ config }) => {
        // single index pattern — not combined with span indices
        expect(config?.dataset.esql).toContain(`FROM ${TRANSACTION_INDEXES} |`);
      });
    });

    it('combines transaction and span indices for OTel key metrics', () => {
      const { keyMetrics } = buildDefinitions({ schema: 'otel' });

      keyMetrics.forEach(({ config }) => {
        expect(config?.dataset.esql).toContain(`FROM ${TRANSACTION_INDEXES}, ${SPAN_INDEXES}`);
      });
    });

    it('scopes infrastructure charts to the metric index for both ingestion types', () => {
      (['ecs', 'otel'] as const).forEach((schema) => {
        const { infrastructureMetrics } = buildDefinitions({ schema });

        infrastructureMetrics.forEach(({ config }) => {
          expect(config?.dataset.esql).toContain(METRIC_INDEXES);
        });
      });
    });

    it('returns chart layout without config when indices are undefined (APM)', () => {
      const { keyMetrics, infrastructureMetrics } = buildDefinitions({
        indices: undefined,
        latencyTitleAction: 'latency-action',
      });

      expect(keyMetrics.map((c) => c.id)).toEqual([
        'latency',
        'failedTransactionRate',
        'throughput',
      ]);
      expect(infrastructureMetrics.map((c) => c.id)).toEqual(['cpuUsage', 'memoryUsage']);
      [...keyMetrics, ...infrastructureMetrics].forEach((chart) => {
        expect(chart.title).toEqual(expect.any(String));
        expect(chart.config).toBeUndefined();
      });
      expect(keyMetrics[0].titleAction).toBe('latency-action');
    });

    it('returns chart layout without config when indices are undefined (OTel)', () => {
      const { keyMetrics } = buildDefinitions({
        indices: undefined,
        schema: 'otel',
      });

      keyMetrics.forEach((chart) => {
        expect(chart.title).toEqual(expect.any(String));
        expect(chart.config).toBeUndefined();
      });
    });

    it('attaches the latency title action to the latency chart only', () => {
      const { keyMetrics } = buildDefinitions({ latencyTitleAction: 'latency-action' });

      expect(keyMetrics[0].titleAction).toBe('latency-action');
      expect(keyMetrics[1].titleAction).toBeUndefined();
    });

    it('attaches the latency title action to the OTel latency chart only', () => {
      const { keyMetrics } = buildDefinitions({
        schema: 'otel',
        latencyTitleAction: 'latency-action',
      });

      expect(keyMetrics[0].titleAction).toBe('latency-action');
      expect(keyMetrics[1].titleAction).toBeUndefined();
    });

    it('buckets every chart by a timestamp TBUCKET aliased to the date histogram x-axis', () => {
      const { keyMetrics, infrastructureMetrics } = buildDefinitions();

      [...keyMetrics, ...infrastructureMetrics].forEach(({ config }) => {
        expect(config?.dataset.esql).toContain('BY timestamp = TBUCKET(100)');
        const layer = config?.layers[0];
        expect(layer && 'xAxis' in layer ? layer.xAxis : undefined).toEqual({
          field: 'timestamp',
          type: 'dateHistogram',
        });
      });
    });
  });
});
