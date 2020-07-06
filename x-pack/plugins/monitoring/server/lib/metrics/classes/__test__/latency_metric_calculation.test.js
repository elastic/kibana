/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Metric } from '../';

describe('Latency Metric Calculation', () => {
  it('should return null if any operands are null', () => {
    const timeInMillis = null;
    const totalEvents = 44;
    expect(Metric.calculateLatency(timeInMillis, totalEvents)).toBe(null);
  });

  it('should return null if any operands are negative', () => {
    const timeInMillis = -200;
    const totalEvents = -44;
    expect(Metric.calculateLatency(timeInMillis, totalEvents)).toBe(null);
  });

  it('should return 0 if there were no events in the bucket', () => {
    const timeInMillis = 200;
    const totalEvents = 0;
    expect(Metric.calculateLatency(timeInMillis, totalEvents)).toBe(0);
  });

  it('should divide the time by the number of events for latency calculation', () => {
    const timeInMillis = 200;
    const totalEvents = 12;
    expect(Metric.calculateLatency(timeInMillis, totalEvents)).toBeCloseTo(16.666666666666668);
  });
});
