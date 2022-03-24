/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { startTaskTimer, startTaskTimerWithEventLoopMonitoring } from './task_events';

const TimingSlop = 10; // to account for math/timer rounding errors
const DelayIterations = 4;
const DelayMillis = 250;
const DelayTotal = DelayIterations * DelayMillis - TimingSlop;

async function nonBlockingDelay(millis: number) {
  await new Promise((resolve) => setTimeout(resolve, millis));
}

async function blockingDelay(millis: number) {
  // get task in async queue
  await nonBlockingDelay(0);

  const end = Date.now() + millis;
  // eslint-disable-next-line no-empty
  while (Date.now() < end) {}
}

async function nonBlockingTask() {
  for (let i = 0; i < DelayIterations; i++) {
    await nonBlockingDelay(DelayMillis);
  }
}

async function blockingTask() {
  for (let i = 0; i < DelayIterations; i++) {
    await blockingDelay(DelayMillis);
  }
}

describe('task_events', () => {
  test('startTaskTimer', async () => {
    const stopTaskTimer = startTaskTimer();
    await nonBlockingTask();
    const result = stopTaskTimer();
    expect(result.stop - result.start).not.toBeLessThan(DelayTotal);
    expect(result.eventLoopBlockMs).toBe(undefined);
  });

  // FLAKY: https://github.com/elastic/kibana/issues/128441
  describe('startTaskTimerWithEventLoopMonitoring', () => {
    test('non-blocking', async () => {
      const stopTaskTimer = startTaskTimerWithEventLoopMonitoring({
        monitor: true,
        warn_threshold: 5000,
      });
      await nonBlockingTask();
      const result = stopTaskTimer();
      expect(result.stop - result.start).not.toBeLessThan(DelayTotal);
      expect(result.eventLoopBlockMs).toBeLessThan(DelayMillis);
    });

    test('blocking', async () => {
      const stopTaskTimer = startTaskTimerWithEventLoopMonitoring({
        monitor: true,
        warn_threshold: 5000,
      });
      await blockingTask();
      const result = stopTaskTimer();
      expect(result.stop - result.start).not.toBeLessThan(DelayTotal);
      expect(result.eventLoopBlockMs).not.toBeLessThan(DelayMillis);
    });

    test('not monitoring', async () => {
      const stopTaskTimer = startTaskTimerWithEventLoopMonitoring({
        monitor: false,
        warn_threshold: 5000,
      });
      await blockingTask();
      const result = stopTaskTimer();
      expect(result.stop - result.start).not.toBeLessThan(DelayTotal);
      expect(result.eventLoopBlockMs).toBe(0);
    });
  });
});
