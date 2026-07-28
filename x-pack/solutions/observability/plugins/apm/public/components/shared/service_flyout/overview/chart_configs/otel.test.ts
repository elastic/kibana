/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LensConfig, LensSeriesLayer } from '@kbn/lens-embeddable-utils';
import type { LensESQLConfig } from '../types';
import { LatencyAggregationType } from '../../../../../../common/latency_aggregation_types';
import {
  ENVIRONMENT_ALL,
  ENVIRONMENT_NOT_DEFINED,
} from '../../../../../../common/environment_filter_values';
import {
  OTEL_ERROR_RATE_TITLE,
  buildOtelErrorRateQuery,
  buildOtelLatencyQuery,
  buildOtelThroughputQuery,
} from './otel';
import { getErrorRateChart, getLatencyChart, getThroughputChart } from './shared';

const TRANSACTION_INDEXES = 'traces-apm*';
const SPAN_INDEXES = 'traces-apm.otel-default';
const OTEL_INDEXES = `${TRANSACTION_INDEXES},${SPAN_INDEXES}`;

const SCOPE = {
  serviceName: 'opbeans-java',
  environment: 'production',
};

type XYLensConfig = Extract<LensConfig, { chartType: 'xy' }>;

function seriesLayerOf(config: LensConfig | undefined): LensSeriesLayer {
  if (!config) {
    throw new Error('Expected a built Lens config');
  }
  return (config as XYLensConfig).layers[0] as LensSeriesLayer;
}

function esqlOf(config: LensESQLConfig | undefined): string {
  if (!config) {
    throw new Error('Expected a built Lens config');
  }
  return config.dataset.esql;
}

describe('OTel chart configs', () => {
  describe('getLatencyChart / buildOtelLatencyQuery', () => {
    it('builds avg latency by converting nanosecond duration to milliseconds', () => {
      const chart = getLatencyChart({
        indexes: OTEL_INDEXES,
        latencyAggregationType: LatencyAggregationType.avg,
        buildQuery: (idx, agg) => buildOtelLatencyQuery(idx, SCOPE, agg),
      });

      expect(esqlOf(chart.config)).toEqual(
        'SET unmapped_fields="nullify";\nFROM traces-apm*, traces-apm.otel-default | WHERE kind IN ("Server", "Consumer") | WHERE `service.name` == "opbeans-java" | WHERE `service.environment` == "production" | EVAL duration_ms = TO_DOUBLE(duration) / 1000000 | STATS AVG(duration_ms) BY timestamp = TBUCKET(100)'
      );
      expect(seriesLayerOf(chart.config).yAxis[0].value).toBe('AVG(duration_ms)');
    });

    it('builds p95 percentile latency', () => {
      const chart = getLatencyChart({
        indexes: OTEL_INDEXES,
        latencyAggregationType: LatencyAggregationType.p95,
        buildQuery: (idx, agg) => buildOtelLatencyQuery(idx, SCOPE, agg),
      });

      expect(esqlOf(chart.config)).toContain('STATS PERCENTILE(duration_ms, 95)');
      expect(seriesLayerOf(chart.config).yAxis[0].value).toBe('PERCENTILE(duration_ms, 95)');
    });

    it('builds p99 percentile latency', () => {
      const chart = getLatencyChart({
        indexes: OTEL_INDEXES,
        latencyAggregationType: LatencyAggregationType.p99,
        buildQuery: (idx, agg) => buildOtelLatencyQuery(idx, SCOPE, agg),
      });

      expect(esqlOf(chart.config)).toContain('STATS PERCENTILE(duration_ms, 99)');
      expect(seriesLayerOf(chart.config).yAxis[0].value).toBe('PERCENTILE(duration_ms, 99)');
    });

    it('does not filter by transaction type', () => {
      const chart = getLatencyChart({
        indexes: OTEL_INDEXES,
        latencyAggregationType: LatencyAggregationType.avg,
        buildQuery: (idx, agg) => buildOtelLatencyQuery(idx, SCOPE, agg),
      });

      expect(esqlOf(chart.config)).not.toContain('transaction.type');
    });

    it('filters by sentinel string OR IS NULL when environment is ENVIRONMENT_NOT_DEFINED', () => {
      const chart = getLatencyChart({
        indexes: OTEL_INDEXES,
        latencyAggregationType: LatencyAggregationType.avg,
        buildQuery: (idx, agg) =>
          buildOtelLatencyQuery(idx, { ...SCOPE, environment: ENVIRONMENT_NOT_DEFINED.value }, agg),
      });

      expect(esqlOf(chart.config)).toContain(
        `\`service.environment\` == "${ENVIRONMENT_NOT_DEFINED.value}" OR \`service.environment\` IS NULL`
      );
    });

    it('omits the environment clause when environment is ENVIRONMENT_ALL', () => {
      const chart = getLatencyChart({
        indexes: OTEL_INDEXES,
        latencyAggregationType: LatencyAggregationType.avg,
        buildQuery: (idx, agg) =>
          buildOtelLatencyQuery(idx, { ...SCOPE, environment: ENVIRONMENT_ALL.value }, agg),
      });

      expect(esqlOf(chart.config)).not.toContain('service.environment');
    });

    it('returns no config when indexes are undefined', () => {
      const chart = getLatencyChart({
        indexes: undefined,
        latencyAggregationType: LatencyAggregationType.avg,
        buildQuery: (idx, agg) => buildOtelLatencyQuery(idx, SCOPE, agg),
      });

      expect(chart.id).toBe('latency');
      expect(chart.config).toBeUndefined();
    });

    it('attaches the title action to the chart definition', () => {
      const chart = getLatencyChart({
        indexes: OTEL_INDEXES,
        latencyAggregationType: LatencyAggregationType.avg,
        titleAction: 'latency-action',
        buildQuery: (idx, agg) => buildOtelLatencyQuery(idx, SCOPE, agg),
      });

      expect(chart.titleAction).toBe('latency-action');
    });
  });

  describe('getThroughputChart / buildOtelThroughputQuery', () => {
    it('builds throughput from a raw count of server and consumer spans per bucket', () => {
      const chart = getThroughputChart({
        indexes: OTEL_INDEXES,
        buildQuery: (idx) => buildOtelThroughputQuery(idx, SCOPE),
      });

      expect(esqlOf(chart.config)).toEqual(
        'SET unmapped_fields="nullify";\nFROM traces-apm*, traces-apm.otel-default | WHERE kind IN ("Server", "Consumer") | WHERE `service.name` == "opbeans-java" | WHERE `service.environment` == "production" | STATS COUNT(*) BY timestamp = TBUCKET(100)'
      );
      expect(seriesLayerOf(chart.config).yAxis[0].value).toBe('COUNT(*)');
    });
  });

  describe('getErrorRateChart / buildOtelErrorRateQuery', () => {
    it('builds error rate using status.code with all spans as the denominator', () => {
      const chart = getErrorRateChart({
        indexes: OTEL_INDEXES,
        title: OTEL_ERROR_RATE_TITLE,
        buildQuery: (idx) => buildOtelErrorRateQuery(idx, SCOPE),
      });

      expect(esqlOf(chart.config)).toEqual(
        'SET unmapped_fields="nullify";\nFROM traces-apm*, traces-apm.otel-default | WHERE kind IN ("Server", "Consumer") | WHERE `service.name` == "opbeans-java" | WHERE `service.environment` == "production" | STATS failure = COUNT(*) WHERE TO_STRING(status.code) == "Error", all = COUNT(*) BY timestamp = TBUCKET(100) | EVAL failed_transaction_rate = TO_DOUBLE(failure) / all | KEEP timestamp, failed_transaction_rate | SORT timestamp'
      );
      expect(seriesLayerOf(chart.config).yAxis[0].value).toBe('failed_transaction_rate');
      expect((chart.config as XYLensConfig).yBounds).toEqual({
        mode: 'custom',
        lowerBound: 0,
        upperBound: 1,
      });
    });

    it('counts all spans regardless of status in the denominator', () => {
      const chart = getErrorRateChart({
        indexes: OTEL_INDEXES,
        title: OTEL_ERROR_RATE_TITLE,
        buildQuery: (idx) => buildOtelErrorRateQuery(idx, SCOPE),
      });
      const esql = esqlOf(chart.config);

      expect(esql).toContain('all = COUNT(*) BY');
      expect(esql).not.toContain('all = COUNT(*) WHERE');
    });
  });
});
