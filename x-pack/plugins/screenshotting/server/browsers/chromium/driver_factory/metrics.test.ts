/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('os');

import { cpus } from 'os';
import { Metrics, getMetrics } from './metrics';

describe('getMetrics', () => {
  const start = {
    metrics: [
      { name: 'ProcessTime', value: 10 },
      { name: 'Timestamp', value: 1000 },
      { name: 'JSHeapTotalSize', value: 1 * 1024 * 1024 },
    ],
  } as Metrics;
  const end = {
    metrics: [
      { name: 'ProcessTime', value: 110 },
      { name: 'Timestamp', value: 2000 },
      { name: 'JSHeapTotalSize', value: 5 * 1024 * 1024 },
    ],
  } as Metrics;

  beforeEach(() => {
    (cpus as jest.MockedFunction<typeof cpus>).mockReturnValue([{} as any]);
  });

  describe('cpu', () => {
    it('should evaluate CPU usage during the runtime', () => {
      const { cpu } = getMetrics(start, end);

      expect(cpu).toBe(0.1);
    });

    it('should respect a number of virtual cores available', () => {
      (cpus as jest.MockedFunction<typeof cpus>).mockReturnValue([{} as any, {} as any]);
      const { cpu } = getMetrics(start, end);

      expect(cpu).toBe(0.05);
    });

    it('should return CPU usage in percentage', () => {
      const { cpuInPercentage } = getMetrics(start, end);

      expect(cpuInPercentage).toBe(10);
    });
  });

  describe('memory', () => {
    it('should evaluate memory consumption during the runtime', () => {
      const { memory } = getMetrics(start, end);

      expect(memory).toBe(5 * 1024 * 1024);
    });

    it('should return memory consumption in megabytes', () => {
      const { memoryInMegabytes } = getMetrics(start, end);

      expect(memoryInMegabytes).toBe(5);
    });
  });
});
