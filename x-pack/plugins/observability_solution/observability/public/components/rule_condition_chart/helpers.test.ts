/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  Aggregators,
  CustomThresholdExpressionMetric,
} from '../../../common/custom_threshold_rule/types';
import { getBufferThreshold, getLensOperationFromRuleMetric, lensFieldFormatter } from './helpers';
const useCases = [
  [
    {
      aggType: Aggregators.SUM,
      field: 'system.cpu.user.pct',
      filter: '',
      name: '',
    },
    'sum(system.cpu.user.pct)',
  ],
  [
    {
      aggType: Aggregators.MAX,
      field: 'system.cpu.user.pct',
      filter: '',
      name: '',
    },
    'max(system.cpu.user.pct)',
  ],
  [
    {
      aggType: Aggregators.MIN,
      field: 'system.cpu.user.pct',
      filter: '',
      name: '',
    },
    'min(system.cpu.user.pct)',
  ],
  [
    {
      aggType: Aggregators.AVERAGE,
      field: 'system.cpu.user.pct',
      filter: '',
      name: '',
    },
    'average(system.cpu.user.pct)',
  ],
  [
    {
      aggType: Aggregators.COUNT,
      field: 'system.cpu.user.pct',
      filter: '',
      name: '',
    },
    'count(___records___)',
  ],
  [
    {
      aggType: Aggregators.CARDINALITY,
      field: 'system.cpu.user.pct',
      filter: '',
      name: '',
    },
    'unique_count(system.cpu.user.pct)',
  ],
  [
    {
      aggType: Aggregators.P95,
      field: 'system.cpu.user.pct',
      filter: '',
      name: '',
    },
    'percentile(system.cpu.user.pct, percentile=95)',
  ],
  [
    {
      aggType: Aggregators.P99,
      field: 'system.cpu.user.pct',
      filter: '',
      name: '',
    },
    'percentile(system.cpu.user.pct, percentile=99)',
  ],
  [
    {
      aggType: Aggregators.RATE,
      field: 'system.network.in.bytes',
      filter: '',
      name: '',
    },
    `counter_rate(max(system.network.in.bytes), kql='')`,
  ],
  [
    {
      aggType: Aggregators.RATE,
      field: 'system.network.in.bytes',
      filter: 'host.name : "foo"',
      name: '',
    },
    `counter_rate(max(system.network.in.bytes), kql='host.name : foo')`,
  ],
];

test.each(useCases)('returns the correct operation from %p. =>  %p', (metric, expectedValue) => {
  return expect(getLensOperationFromRuleMetric(metric as CustomThresholdExpressionMetric)).toEqual(
    expectedValue
  );
});

describe('getBufferThreshold', () => {
  const testData = [
    { threshold: undefined, buffer: '0.00' },
    { threshold: 0.1, buffer: '0.12' },
    { threshold: 0.01, buffer: '0.02' },
    { threshold: 0.001, buffer: '0.01' },
    { threshold: 0.00098, buffer: '0.01' },
    { threshold: 130, buffer: '143.00' },
  ];

  it.each(testData)('getBufferThreshold($threshold) = $buffer', ({ threshold, buffer }) => {
    expect(getBufferThreshold(threshold)).toBe(buffer);
  });
});

describe('lensFieldFormatter', () => {
  const testData = [
    { metrics: [{ field: 'system.bytes' }], format: 'bits' },
    { metrics: [{ field: 'system.pct' }], format: 'percent' },
    { metrics: [{ field: 'system.host.cores' }], format: 'number' },
    { metrics: [{ field: undefined }], format: 'number' },
  ];
  it.each(testData)('getBufferThreshold($threshold) = $buffer', ({ metrics, format }) => {
    expect(lensFieldFormatter(metrics as unknown as CustomThresholdExpressionMetric[])).toBe(
      format
    );
  });
});
