/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LensConfig, LensSeriesLayer } from '@kbn/lens-embeddable-utils';
import type { LensESQLConfig } from '../types';
import { getCpuUsageChart, getMemoryUsageChart } from './apm';

const METRIC_INDEXES = 'metrics-apm*';

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

    it('returns no config when indices are undefined', () => {
      const chart = getCpuUsageChart(undefined, METRIC_SCOPE);

      expect(chart.id).toBe('cpuUsage');
      expect(chart.config).toBeUndefined();
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
