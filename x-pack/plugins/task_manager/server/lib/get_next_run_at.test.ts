/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { taskManagerMock } from '../mocks';

import { getNextRunAt } from './get_next_run_at';

describe('getNextRunAt', () => {
  test('should return newRunAt when the taskUpdates parameter contains runAt', () => {
    const nextRunAt = getNextRunAt(
      taskManagerMock.createTask(),
      { runAt: new Date('1970-01-01T00:05:30.000Z') },
      0
    );
    expect(nextRunAt).toEqual(new Date('1970-01-01T00:05:30.000Z'));
  });

  test('should use the new schedule when the taskUpdates parameter contains schedule', () => {
    const now = new Date();
    const nextRunAt = getNextRunAt(
      taskManagerMock.createTask({ schedule: { interval: '1m' }, runAt: now, startedAt: now }),
      { schedule: { interval: '1h' } },
      0
    );
    expect(nextRunAt).toEqual(new Date(now.getTime() + 3600000));
  });

  test('should use startedAt when the task delay is greater than the threshold', () => {
    const now = new Date();
    // Use time in the past to ensure the task delay calculation isn't relative to "now"
    const fiveSecondsAgo = new Date(now.getTime() - 5000);
    const fourSecondsAgo = new Date(now.getTime() - 4000);
    const nextRunAt = getNextRunAt(
      taskManagerMock.createTask({
        schedule: { interval: '1m' },
        runAt: fiveSecondsAgo,
        startedAt: fourSecondsAgo,
      }),
      {},
      500
    );
    expect(nextRunAt).toEqual(new Date(fourSecondsAgo.getTime() + 60000));
  });

  test('should use runAt when the task delay is greater than the threshold', () => {
    const now = new Date();
    // Use time in the past to ensure the task delay calculation isn't relative to "now"
    const fiveSecondsAgo = new Date(now.getTime() - 5000);
    const aBitLessThanFiveSecondsAgo = new Date(now.getTime() - 4995);
    const nextRunAt = getNextRunAt(
      taskManagerMock.createTask({
        schedule: { interval: '1m' },
        runAt: fiveSecondsAgo,
        startedAt: aBitLessThanFiveSecondsAgo,
      }),
      {},
      500
    );
    expect(nextRunAt).toEqual(new Date(fiveSecondsAgo.getTime() + 60000));
  });

  test('should not schedule in the past', () => {
    const testStart = new Date();
    const fiveMinsAgo = new Date(Date.now() - 300000);
    const nextRunAt = getNextRunAt(
      taskManagerMock.createTask({
        schedule: { interval: '1m' },
        runAt: fiveMinsAgo,
        startedAt: fiveMinsAgo,
      }),
      {},
      0
    );
    expect(nextRunAt.getTime()).toBeGreaterThanOrEqual(testStart.getTime());
  });
});
