/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LatencyAggregationType } from '../../../../../../common/latency_aggregation_types';
import { ChartType } from '../../../charts/helper/get_timeseries_color';
import { getInfrastructureMetricCharts, getLatencyChartType, getEsqlKeyMetricCharts } from '.';

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

function buildKeyMetrics(
  overrides: Partial<Parameters<typeof getEsqlKeyMetricCharts>[0]> = {}
): ReturnType<typeof getEsqlKeyMetricCharts> {
  return getEsqlKeyMetricCharts({
    indices: MOCK_INDICES,
    schema: 'otel',
    serviceName: 'opbeans-java',
    environment: 'production',
    transactionType: 'request',
    latencyAggregationType: LatencyAggregationType.avg,
    ...overrides,
  });
}

const buildOtelKeyMetrics = buildKeyMetrics;
const buildEcsKeyMetrics = (
  overrides: Partial<Parameters<typeof getEsqlKeyMetricCharts>[0]> = {}
) => buildKeyMetrics({ schema: 'ecs', ...overrides });

function buildInfrastructureMetrics(
  overrides: Partial<Parameters<typeof getInfrastructureMetricCharts>[0]> = {}
): ReturnType<typeof getInfrastructureMetricCharts> {
  return getInfrastructureMetricCharts({
    indices: MOCK_INDICES,
    serviceName: 'opbeans-java',
    environment: 'production',
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

  describe('getEsqlKeyMetricCharts', () => {
    it('scopes ECS key metrics to the transaction index only with the transaction type filter', () => {
      const keyMetrics = buildEcsKeyMetrics();

      expect(keyMetrics.map((c) => c.id)).toEqual([
        'latency',
        'failedTransactionRate',
        'throughput',
      ]);
      keyMetrics.forEach(({ config }) => {
        // single index pattern — not combined with span indices
        expect(config?.dataset.esql).toContain(`FROM ${TRANSACTION_INDEXES} |`);
        expect(config?.dataset.esql).toContain('`processor.event` == "transaction"');
      });
      expect(keyMetrics[0].config?.dataset.esql).toContain('`transaction.type` == "request"');
    });

    it('returns chart layout without config for ECS when indices are undefined', () => {
      const keyMetrics = buildEcsKeyMetrics({ indices: undefined });

      keyMetrics.forEach((chart) => {
        expect(chart.title).toEqual(expect.any(String));
        expect(chart.config).toBeUndefined();
      });
    });

    it('returns the RED key metric charts', () => {
      const keyMetrics = buildOtelKeyMetrics();

      expect(keyMetrics.map((c) => c.id)).toEqual([
        'latency',
        'failedTransactionRate',
        'throughput',
      ]);
    });

    it('combines transaction and span indices', () => {
      const keyMetrics = buildOtelKeyMetrics();

      keyMetrics.forEach(({ config }) => {
        expect(config?.dataset.esql).toContain(`FROM ${TRANSACTION_INDEXES}, ${SPAN_INDEXES}`);
      });
    });

    it('returns chart layout without config when indices are undefined', () => {
      const keyMetrics = buildOtelKeyMetrics({
        indices: undefined,
        latencyTitleAction: 'latency-action',
      });

      expect(keyMetrics.map((c) => c.id)).toEqual([
        'latency',
        'failedTransactionRate',
        'throughput',
      ]);
      keyMetrics.forEach((chart) => {
        expect(chart.title).toEqual(expect.any(String));
        expect(chart.config).toBeUndefined();
      });
      expect(keyMetrics[0].titleAction).toBe('latency-action');
    });

    it('attaches the latency title action to the latency chart only', () => {
      const keyMetrics = buildOtelKeyMetrics({ latencyTitleAction: 'latency-action' });

      expect(keyMetrics[0].titleAction).toBe('latency-action');
      expect(keyMetrics[1].titleAction).toBeUndefined();
    });

    it('formats the latency y-axis as an auto-scaled duration from milliseconds', () => {
      const [latency] = buildOtelKeyMetrics();
      const layer = latency.config?.layers[0];
      const yAxis = layer && 'yAxis' in layer ? layer.yAxis?.[0] : undefined;

      expect(yAxis).toEqual(
        expect.objectContaining({
          format: 'duration',
          // Duration field formatter unit names — the legacy LensConfigBuilder
          // forwards these verbatim; short API names ('ms'/'auto') break it.
          fromUnit: 'milliseconds',
          toUnit: 'humanizePrecise',
          compactValues: true,
        })
      );
    });

    it('embeds the CPS project routing as a SET pre-statement in every chart query', () => {
      const keyMetrics = buildOtelKeyMetrics({ projectRouting: '_alias:*' });

      keyMetrics.forEach(({ config }) => {
        expect(config?.dataset.esql).toMatch(
          /^SET project_routing="_alias:\*";\nSET unmapped_fields="nullify";\n/
        );
      });
    });

    it('omits the project routing SET when no routing is provided', () => {
      const keyMetrics = buildOtelKeyMetrics();

      keyMetrics.forEach(({ config }) => {
        expect(config?.dataset.esql).not.toContain('SET project_routing');
        expect(config?.dataset.esql).toMatch(/^SET unmapped_fields="nullify";\n/);
      });
    });

    it('buckets every chart by a timestamp TBUCKET aliased to the date histogram x-axis', () => {
      const keyMetrics = buildOtelKeyMetrics();

      keyMetrics.forEach(({ config }) => {
        expect(config?.dataset.esql).toContain('BY timestamp = TBUCKET(100)');
        const layer = config?.layers[0];
        expect(layer && 'xAxis' in layer ? layer.xAxis : undefined).toEqual({
          field: 'timestamp',
          type: 'dateHistogram',
        });
      });
    });
  });

  describe('getInfrastructureMetricCharts', () => {
    it('returns the infrastructure charts scoped to the metric index', () => {
      const infrastructureMetrics = buildInfrastructureMetrics();

      expect(infrastructureMetrics.map((c) => c.id)).toEqual(['cpuUsage', 'memoryUsage']);
      infrastructureMetrics.forEach(({ config }) => {
        expect(config?.dataset.esql).toContain(METRIC_INDEXES);
        expect(config?.dataset.esql).toContain('BY timestamp = TBUCKET(100)');
      });
    });

    it('returns chart layout without config when indices are undefined', () => {
      const infrastructureMetrics = buildInfrastructureMetrics({ indices: undefined });

      expect(infrastructureMetrics.map((c) => c.id)).toEqual(['cpuUsage', 'memoryUsage']);
      infrastructureMetrics.forEach((chart) => {
        expect(chart.config).toBeUndefined();
      });
    });

    it('embeds the CPS project routing as a SET pre-statement', () => {
      const infrastructureMetrics = buildInfrastructureMetrics({ projectRouting: '_alias:*' });

      infrastructureMetrics.forEach(({ config }) => {
        expect(config?.dataset.esql).toMatch(
          /^SET project_routing="_alias:\*";\nSET unmapped_fields="nullify";\n/
        );
      });
    });
  });
});
