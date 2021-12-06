/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Metrics as PuppeteerMetrics } from 'puppeteer';
import { cpus } from 'os';

declare module 'puppeteer' {
  interface CDPSession {
    send(command: 'Performance.getMetrics'): Promise<RawMetrics>;
  }
}

type RawMetrics = Metrics;

export interface Metrics {
  metrics: Metric[];
}

interface Metric {
  name: keyof NormalizedMetrics;
  value: unknown;
}

interface NormalizedMetrics extends Required<PuppeteerMetrics> {
  ProcessTime: number;
}

/**
 * Collected performance metrics during a screenshotting session.
 */
export interface PerformanceMetrics {
  /**
   * The percentage of CPU time spent by the browser divided by number or cores.
   */
  cpu: number;

  /**
   * The percentage of CPU in percent untis.
   */
  cpuInPercentage: number;

  /**
   * The total amount of memory used by the browser.
   */
  memory: number;

  /**
   * The total amount of memory used by the browser in megabytes.
   */
  memoryInMegabytes: number;
}

function normalizeMetrics({ metrics }: Metrics) {
  return Object.fromEntries(
    metrics.map(({ name, value }) => [name, value])
  ) as unknown as NormalizedMetrics;
}

function getCpuUsage(start: NormalizedMetrics, end: NormalizedMetrics) {
  return (end.ProcessTime - start.ProcessTime) / (end.Timestamp - start.Timestamp) / cpus().length;
}

function toPercentage(value: number) {
  return Math.round((value + Number.EPSILON) * 10000) / 100;
}

function toMegabytes(value: number) {
  return Math.round((value / 1024 / 1024 + Number.EPSILON) * 100) / 100;
}

export function getMetrics(start: Metrics, end: Metrics): PerformanceMetrics {
  const startMetrics = normalizeMetrics(start);
  const endMetrics = normalizeMetrics(end);

  const cpu = getCpuUsage(startMetrics, endMetrics);
  const cpuInPercentage = toPercentage(cpu);
  const { JSHeapTotalSize: memory } = endMetrics;
  const memoryInMegabytes = toMegabytes(memory);

  return {
    cpu,
    cpuInPercentage,
    memory,
    memoryInMegabytes,
  };
}
