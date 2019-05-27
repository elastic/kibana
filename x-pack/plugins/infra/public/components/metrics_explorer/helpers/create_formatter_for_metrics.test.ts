/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createFormatterForMetric } from './create_formatter_for_metric';
import { MetricsExplorerAggregation } from '../../../../server/routes/metrics_explorer/types';
describe('createFormatterForMetric()', () => {
  it('should just work for count', () => {
    const metric = { aggregation: MetricsExplorerAggregation.count };
    const format = createFormatterForMetric(metric);
    expect(format(1291929)).toBe('1,291,929');
  });
  it('should just work for numerics', () => {
    const metric = { aggregation: MetricsExplorerAggregation.avg, field: 'system.load.1' };
    const format = createFormatterForMetric(metric);
    expect(format(1000.2)).toBe('1,000.2');
  });
  it('should just work for percents', () => {
    const metric = { aggregation: MetricsExplorerAggregation.avg, field: 'system.cpu.total.pct' };
    const format = createFormatterForMetric(metric);
    expect(format(0.349)).toBe('34.9%');
  });
  it('should just work for rates', () => {
    const metric = {
      aggregation: MetricsExplorerAggregation.rate,
      field: 'system.network.out.bytes',
    };
    const format = createFormatterForMetric(metric);
    expect(format(103929292)).toBe('103.9Mbit/s');
  });
  it('should just work for bytes', () => {
    const metric = {
      aggregation: MetricsExplorerAggregation.avg,
      field: 'system.network.out.bytes',
    };
    const format = createFormatterForMetric(metric);
    expect(format(103929292)).toBe('103.9MB');
  });
});
