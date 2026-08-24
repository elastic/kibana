/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ApmDocumentType } from '../../../../../../common/document_type';
import { RollupInterval } from '../../../../../../common/rollup';
import { LatencyAggregationType } from '../../../../../../common/latency_aggregation_types';
import { ChartType } from '../../../charts/helper/get_timeseries_color';
import { getChartDefinitions, getLatencyChartType } from '.';
import type { FlyoutChartDataSource } from './shared';

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

const SERVICE_TRANSACTION_SOURCE: FlyoutChartDataSource = {
  documentType: ApmDocumentType.ServiceTransactionMetric,
  rollupInterval: RollupInterval.TenMinutes,
  hasDurationSummaryField: true,
  hasDocs: true,
  bucketSizeInSeconds: 600,
};

const TRANSACTION_EVENT_SOURCE: FlyoutChartDataSource = {
  documentType: ApmDocumentType.TransactionEvent,
  rollupInterval: RollupInterval.None,
  hasDurationSummaryField: false,
  hasDocs: true,
  bucketSizeInSeconds: 60,
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
    isTransactionTypeResolved: true,
    dataSource: SERVICE_TRANSACTION_SOURCE,
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

    it('reads APM key metrics from the rollups the chart APIs prefer', () => {
      const { keyMetrics } = buildDefinitions();

      keyMetrics.forEach(({ config }) => {
        expect(config?.dataset.esql).toContain(`FROM ${METRIC_INDEXES} |`);
        expect(config?.dataset.esql).toContain('WHERE `metricset.name` == "service_transaction"');
        expect(config?.dataset.esql).toContain('WHERE `metricset.interval` == "10m"');
        expect(config?.dataset.esql).toContain('BY timestamp = TBUCKET(600 seconds)');
      });
    });

    it('falls back to raw transactions when the preferred source has no rollups', () => {
      const { keyMetrics } = buildDefinitions({ dataSource: TRANSACTION_EVENT_SOURCE });

      keyMetrics.forEach(({ config }) => {
        expect(config?.dataset.esql).toContain(`FROM ${TRANSACTION_INDEXES} |`);
        expect(config?.dataset.esql).toContain('WHERE `processor.event` == "transaction"');
        expect(config?.dataset.esql).toContain('BY timestamp = TBUCKET(60 seconds)');
      });
    });

    it('falls back to raw transactions when the rollups predate the duration summary field', () => {
      const { keyMetrics } = buildDefinitions({
        dataSource: {
          ...SERVICE_TRANSACTION_SOURCE,
          documentType: ApmDocumentType.TransactionMetric,
          rollupInterval: RollupInterval.OneMinute,
          hasDurationSummaryField: false,
        },
      });

      keyMetrics.forEach(({ config }) => {
        expect(config?.dataset.esql).toContain(`FROM ${TRANSACTION_INDEXES} |`);
        expect(config?.dataset.esql).not.toContain('metricset.name');
      });
    });

    it('holds the APM key metric queries until the data source is known', () => {
      const { keyMetrics } = buildDefinitions({ dataSource: undefined });

      keyMetrics.forEach((chart) => {
        expect(chart.title).toEqual(expect.any(String));
        expect(chart.config).toBeUndefined();
      });
    });

    it('holds the APM key metric queries until the transaction type is resolved', () => {
      const { keyMetrics } = buildDefinitions({ isTransactionTypeResolved: false });

      keyMetrics.forEach((chart) => {
        expect(chart.config).toBeUndefined();
      });
    });

    it('builds OTel key metrics without waiting for an APM data source', () => {
      const { keyMetrics } = buildDefinitions({
        schema: 'otel',
        dataSource: undefined,
        isTransactionTypeResolved: false,
      });

      keyMetrics.forEach(({ config }) => {
        expect(config?.dataset.esql).toContain(`FROM ${TRANSACTION_INDEXES}, ${SPAN_INDEXES}`);
        expect(config?.dataset.esql).toContain('BY timestamp = TBUCKET(100)');
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

    it('embeds the CPS project routing as a SET pre-statement in every chart query', () => {
      (['ecs', 'otel'] as const).forEach((schema) => {
        const { keyMetrics, infrastructureMetrics } = buildDefinitions({
          schema,
          projectRouting: '_alias:*',
        });

        [...keyMetrics, ...infrastructureMetrics].forEach(({ config }) => {
          expect(config?.dataset.esql).toMatch(
            /^SET project_routing="_alias:\*";\nSET unmapped_fields="nullify";\n/
          );
        });
      });
    });

    it('omits the project routing SET when no routing is provided', () => {
      const { keyMetrics, infrastructureMetrics } = buildDefinitions();

      [...keyMetrics, ...infrastructureMetrics].forEach(({ config }) => {
        expect(config?.dataset.esql).not.toContain('SET project_routing');
        expect(config?.dataset.esql).toMatch(/^SET unmapped_fields="nullify";\n/);
      });
    });

    it('labels the APM throughput axis with the per-minute unit', () => {
      const { keyMetrics } = buildDefinitions();
      const layer = keyMetrics[2].config?.layers[0];

      expect(layer && 'yAxis' in layer ? layer.yAxis[0] : undefined).toMatchObject({
        value: 'throughput',
        suffix: ' tpm',
      });
    });

    it('leaves the OTel throughput axis as a per-bucket count', () => {
      const { keyMetrics } = buildDefinitions({ schema: 'otel' });
      const layer = keyMetrics[2].config?.layers[0];

      expect(layer && 'yAxis' in layer ? layer.yAxis[0] : undefined).toMatchObject({
        value: 'COUNT(*)',
      });
      expect(layer && 'yAxis' in layer ? layer.yAxis[0] : undefined).not.toHaveProperty('suffix');
    });

    it('aliases the time bucket to the date histogram x-axis in every chart', () => {
      const { keyMetrics, infrastructureMetrics } = buildDefinitions();

      [...keyMetrics, ...infrastructureMetrics].forEach(({ config }) => {
        expect(config?.dataset.esql).toContain('BY timestamp = TBUCKET(');
        const layer = config?.layers[0];
        expect(layer && 'xAxis' in layer ? layer.xAxis : undefined).toEqual({
          field: 'timestamp',
          type: 'dateHistogram',
        });
      });
    });
  });
});
