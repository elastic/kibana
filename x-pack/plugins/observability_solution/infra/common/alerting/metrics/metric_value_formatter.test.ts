/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { metricValueFormatter } from './metric_value_formatter';

describe('metricValueFormatter', () => {
  const testData = [
    { value: null, metric: undefined, result: '[NO DATA]' },
    { value: null, metric: 'system.cpu.user.pct', result: '[NO DATA]' },
    { value: 50, metric: undefined, result: '50' },
    { value: 0.7, metric: 'system.cpu.user.pct', result: '70%' },
    { value: 0.7012345, metric: 'system.cpu.user.pct', result: '70.1%' },
    { value: 208, metric: 'system.cpu.user.ticks', result: '208' },
    { value: 0.8, metric: 'system.cpu.user.ticks', result: '0.8' },
  ];

  it.each(testData)(
    'metricValueFormatter($value, $metric) = $result',
    ({ value, metric, result }) => {
      expect(metricValueFormatter(value, metric)).toBe(result);
    }
  );
});
