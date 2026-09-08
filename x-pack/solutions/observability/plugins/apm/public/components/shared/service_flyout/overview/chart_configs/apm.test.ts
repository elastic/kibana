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
  APM_ERROR_RATE_TITLE,
  buildApmErrorRateQuery,
  buildApmLatencyQuery,
  buildApmThroughputQuery,
  getCpuUsageChart,
  getMemoryUsageChart,
} from './apm';
import { getErrorRateChart, getLatencyChart, getThroughputChart } from './shared';

const TRANSACTION_INDEXES = 'traces-apm*';
const METRIC_INDEXES = 'metrics-apm*';

const SCOPE = {
  serviceName: 'opbeans-java',
  environment: 'production',
  transactionType: 'request',
};

const METRIC_SCOPE = {
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

describe('APM chart configs', () => {
  describe('getLatencyChart / buildApmLatencyQuery', () => {
    it('builds avg latency from average transaction duration', () => {
      const chart = getLatencyChart({
        indices: TRANSACTION_INDEXES,
        latencyAggregationType: LatencyAggregationType.avg,
        buildQuery: (idx, agg) => buildApmLatencyQuery(idx, SCOPE, agg),
      });

      expect(esqlOf(chart.config)).toEqual(
        'SET unmapped_fields="nullify";\nFROM traces-apm* | WHERE `processor.event` == "transaction" | WHERE `transaction.type` == "request" | WHERE `service.name` == "opbeans-java" | WHERE `service.environment` == "production" | EVAL duration_ms = TO_DOUBLE(transaction.duration.us) / 1000 | STATS AVG(duration_ms) BY timestamp = TBUCKET(100)'
      );
      expect(seriesLayerOf(chart.config).yAxis[0].value).toBe('AVG(duration_ms)');
    });

    it('builds p95 percentile latency', () => {
      const chart = getLatencyChart({
        indices: TRANSACTION_INDEXES,
        latencyAggregationType: LatencyAggregationType.p95,
        buildQuery: (idx, agg) => buildApmLatencyQuery(idx, SCOPE, agg),
      });

      expect(esqlOf(chart.config)).toEqual(
        'SET unmapped_fields="nullify";\nFROM traces-apm* | WHERE `processor.event` == "transaction" | WHERE `transaction.type` == "request" | WHERE `service.name` == "opbeans-java" | WHERE `service.environment` == "production" | EVAL duration_ms = TO_DOUBLE(transaction.duration.us) / 1000 | STATS PERCENTILE(duration_ms, 95) BY timestamp = TBUCKET(100)'
      );
      expect(seriesLayerOf(chart.config).yAxis[0].value).toBe('PERCENTILE(duration_ms, 95)');
    });

    it('builds p99 percentile latency', () => {
      const chart = getLatencyChart({
        indices: TRANSACTION_INDEXES,
        latencyAggregationType: LatencyAggregationType.p99,
        buildQuery: (idx, agg) => buildApmLatencyQuery(idx, SCOPE, agg),
      });

      expect(esqlOf(chart.config)).toEqual(
        'SET unmapped_fields="nullify";\nFROM traces-apm* | WHERE `processor.event` == "transaction" | WHERE `transaction.type` == "request" | WHERE `service.name` == "opbeans-java" | WHERE `service.environment` == "production" | EVAL duration_ms = TO_DOUBLE(transaction.duration.us) / 1000 | STATS PERCENTILE(duration_ms, 99) BY timestamp = TBUCKET(100)'
      );
      expect(seriesLayerOf(chart.config).yAxis[0].value).toBe('PERCENTILE(duration_ms, 99)');
    });

    it('filters by the literal sentinel and missing field when environment is ENVIRONMENT_NOT_DEFINED', () => {
      const chart = getLatencyChart({
        indices: TRANSACTION_INDEXES,
        latencyAggregationType: LatencyAggregationType.avg,
        buildQuery: (idx, agg) =>
          buildApmLatencyQuery(idx, { ...SCOPE, environment: ENVIRONMENT_NOT_DEFINED.value }, agg),
      });

      expect(esqlOf(chart.config)).toEqual(
        'SET unmapped_fields="nullify";\nFROM traces-apm* | WHERE `processor.event` == "transaction" | WHERE `transaction.type` == "request" | WHERE `service.name` == "opbeans-java" | WHERE `service.environment` == "ENVIRONMENT_NOT_DEFINED" OR `service.environment` IS NULL | EVAL duration_ms = TO_DOUBLE(transaction.duration.us) / 1000 | STATS AVG(duration_ms) BY timestamp = TBUCKET(100)'
      );
    });

    it('omits the environment clause when environment is ENVIRONMENT_ALL', () => {
      const chart = getLatencyChart({
        indices: TRANSACTION_INDEXES,
        latencyAggregationType: LatencyAggregationType.avg,
        buildQuery: (idx, agg) =>
          buildApmLatencyQuery(idx, { ...SCOPE, environment: ENVIRONMENT_ALL.value }, agg),
      });

      expect(esqlOf(chart.config)).toEqual(
        'SET unmapped_fields="nullify";\nFROM traces-apm* | WHERE `processor.event` == "transaction" | WHERE `transaction.type` == "request" | WHERE `service.name` == "opbeans-java" | EVAL duration_ms = TO_DOUBLE(transaction.duration.us) / 1000 | STATS AVG(duration_ms) BY timestamp = TBUCKET(100)'
      );
    });

    it('omits the transaction type clause when transactionType is empty string', () => {
      const chart = getLatencyChart({
        indices: TRANSACTION_INDEXES,
        latencyAggregationType: LatencyAggregationType.avg,
        buildQuery: (idx, agg) => buildApmLatencyQuery(idx, { ...SCOPE, transactionType: '' }, agg),
      });

      expect(esqlOf(chart.config)).not.toContain('transaction.type');
    });

    it('returns no config when indices are undefined', () => {
      const chart = getLatencyChart({
        indices: undefined,
        latencyAggregationType: LatencyAggregationType.avg,
        buildQuery: (idx, agg) => buildApmLatencyQuery(idx, SCOPE, agg),
      });

      expect(chart.id).toBe('latency');
      expect(chart.config).toBeUndefined();
    });

    it('attaches the title action to the chart definition', () => {
      const chart = getLatencyChart({
        indices: TRANSACTION_INDEXES,
        latencyAggregationType: LatencyAggregationType.avg,
        titleAction: 'latency-action',
        buildQuery: (idx, agg) => buildApmLatencyQuery(idx, SCOPE, agg),
      });

      expect(chart.titleAction).toBe('latency-action');
    });
  });

  describe('getThroughputChart / buildApmThroughputQuery', () => {
    it('builds throughput from a raw count per bucket', () => {
      const chart = getThroughputChart({
        indices: TRANSACTION_INDEXES,
        buildQuery: (idx) => buildApmThroughputQuery(idx, SCOPE),
      });

      expect(esqlOf(chart.config)).toEqual(
        'SET unmapped_fields="nullify";\nFROM traces-apm* | WHERE `processor.event` == "transaction" | WHERE `transaction.type` == "request" | WHERE `service.name` == "opbeans-java" | WHERE `service.environment` == "production" | STATS COUNT(*) BY timestamp = TBUCKET(100)'
      );
      expect(seriesLayerOf(chart.config).yAxis[0].value).toBe('COUNT(*)');
    });
  });

  describe('getErrorRateChart / buildApmErrorRateQuery', () => {
    it('builds failed transaction rate from the event.outcome failure ratio excluding unknown', () => {
      const chart = getErrorRateChart({
        indices: TRANSACTION_INDEXES,
        title: APM_ERROR_RATE_TITLE,
        buildQuery: (idx) => buildApmErrorRateQuery(idx, SCOPE),
      });

      expect(esqlOf(chart.config)).toEqual(
        'SET unmapped_fields="nullify";\nFROM traces-apm* | WHERE `processor.event` == "transaction" | WHERE `transaction.type` == "request" | WHERE `service.name` == "opbeans-java" | WHERE `service.environment` == "production" | STATS failure = COUNT(*) WHERE TO_STRING(event.outcome) == "failure", all = COUNT(*) WHERE (TO_STRING(event.outcome) IN ("failure", "success")) BY timestamp = TBUCKET(100) | EVAL failed_transaction_rate = CASE(all > 0, TO_DOUBLE(failure) / all, NULL) | KEEP timestamp, failed_transaction_rate | SORT timestamp'
      );
      expect(seriesLayerOf(chart.config).yAxis[0].value).toBe('failed_transaction_rate');
      expect((chart.config as XYLensConfig).yBounds).toEqual({
        mode: 'custom',
        lowerBound: 0,
        upperBound: 1,
      });
    });
  });

  describe('getCpuUsageChart', () => {
    it('builds CPU usage from the system cpu percent average', () => {
      const chart = getCpuUsageChart(METRIC_INDEXES, METRIC_SCOPE);

      expect(esqlOf(chart.config)).toEqual(
        'SET unmapped_fields="nullify";\nFROM metrics-apm* | WHERE `processor.event` == "metric" | WHERE `service.name` == "opbeans-java" | WHERE `service.environment` == "production" | WHERE TO_DOUBLE(system.cpu.total.norm.pct) IS NOT NULL | STATS AVG(TO_DOUBLE(system.cpu.total.norm.pct)) BY timestamp = TBUCKET(100)'
      );
      expect(seriesLayerOf(chart.config).yAxis[0].value).toBe(
        'AVG(TO_DOUBLE(system.cpu.total.norm.pct))'
      );
    });

    it('scopes to the metric processor event and excludes transaction type', () => {
      const chart = getCpuUsageChart(METRIC_INDEXES, METRIC_SCOPE);

      expect(esqlOf(chart.config)).toContain('`processor.event` == "metric"');
      expect(esqlOf(chart.config)).not.toContain('transaction.type');
    });
  });

  describe('getMemoryUsageChart', () => {
    it('builds memory usage from cgroup or system memory fields', () => {
      const chart = getMemoryUsageChart(METRIC_INDEXES, METRIC_SCOPE);

      expect(esqlOf(chart.config)).toEqual(
        'SET unmapped_fields="nullify";\nFROM metrics-apm* | WHERE `processor.event` == "metric" | WHERE `service.name` == "opbeans-java" | WHERE `service.environment` == "production" | EVAL cgroup_usage = TO_DOUBLE(system.process.cgroup.memory.mem.usage.bytes) | EVAL cgroup_limit = TO_DOUBLE(system.process.cgroup.memory.mem.`limit`.bytes) | EVAL sys_free = TO_DOUBLE(system.memory.actual.free) | EVAL sys_total = TO_DOUBLE(system.memory.total) | WHERE cgroup_usage IS NOT NULL OR sys_free IS NOT NULL AND sys_total IS NOT NULL | EVAL effective_total = CASE(cgroup_limit > 0 AND cgroup_limit != 9223372036854772000, cgroup_limit, sys_total) | EVAL memory_usage = CASE(cgroup_usage IS NOT NULL AND effective_total > 0, cgroup_usage / effective_total, sys_total > 0 AND sys_free IS NOT NULL, 1 - sys_free / sys_total, NULL) | STATS memory_usage = AVG(memory_usage) BY timestamp = TBUCKET(100) | KEEP timestamp, memory_usage | SORT timestamp'
      );
      expect(seriesLayerOf(chart.config).yAxis[0].value).toBe('memory_usage');
    });
  });
});
