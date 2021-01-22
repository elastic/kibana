/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { performance } from 'perf_hooks';
import { ConcreteTaskInstance } from '../task';
import { WithTaskTiming, startTaskTimer } from '../task_events';
import { TaskPoolRunResult } from '../task_pool';
import { TaskManagerRunner } from '../task_running';
import { ClaimOwnershipResult } from '../task_store';
import { Result, map } from './result_type';

export enum FillPoolResult {
  Failed = 'Failed',
  NoAvailableWorkers = 'NoAvailableWorkers',
  NoTasksClaimed = 'NoTasksClaimed',
  RunningAtCapacity = 'RunningAtCapacity',
  RanOutOfCapacity = 'RanOutOfCapacity',
  PoolFilled = 'PoolFilled',
}

export type ClaimAndFillPoolResult = Partial<Pick<ClaimOwnershipResult, 'stats'>> & {
  result: FillPoolResult;
};
export type TimedFillPoolResult = WithTaskTiming<ClaimAndFillPoolResult>;

/**
 * Given a function that runs a batch of tasks (e.g. taskPool.run), a function
 * that fetches task records (e.g. store.fetchAvailableTasks), and a function
 * that converts task records to the appropriate task runner, this function
 * fills the pool with work.
 *
 * This is annoyingly general in order to simplify testing.
 *
 * @param run - a function that runs a batch of tasks (e.g. taskPool.run)
 * @param fetchAvailableTasks - a function that fetches task records (e.g. store.fetchAvailableTasks)
 * @param converter - a function that converts task records to the appropriate task runner
 */
export async function fillPool(
  fetchAvailableTasks: () => Promise<Result<ClaimOwnershipResult, FillPoolResult>>,
  converter: (taskInstance: ConcreteTaskInstance) => TaskManagerRunner,
  run: (tasks: TaskManagerRunner[]) => Promise<TaskPoolRunResult>
): Promise<TimedFillPoolResult> {
  performance.mark('fillPool.start');
  const stopTaskTimer = startTaskTimer();
  const augmentTimingTo = (
    result: FillPoolResult,
    stats?: ClaimOwnershipResult['stats']
  ): TimedFillPoolResult => ({
    result,
    stats,
    timing: stopTaskTimer(),
  });
  return map<ClaimOwnershipResult, FillPoolResult, Promise<TimedFillPoolResult>>(
    await fetchAvailableTasks(),
    async ({ docs, stats }) => {
      if (!docs.length) {
        performance.mark('fillPool.bailNoTasks');
        performance.measure(
          'fillPool.activityDurationUntilNoTasks',
          'fillPool.start',
          'fillPool.bailNoTasks'
        );
        return augmentTimingTo(FillPoolResult.NoTasksClaimed, stats);
      }

      const tasks = docs.map(converter);

      switch (await run(tasks)) {
        case TaskPoolRunResult.RanOutOfCapacity:
          performance.mark('fillPool.bailExhaustedCapacity');
          performance.measure(
            'fillPool.activityDurationUntilExhaustedCapacity',
            'fillPool.start',
            'fillPool.bailExhaustedCapacity'
          );
          return augmentTimingTo(FillPoolResult.RanOutOfCapacity, stats);
        case TaskPoolRunResult.RunningAtCapacity:
          performance.mark('fillPool.cycle');
          return augmentTimingTo(FillPoolResult.RunningAtCapacity, stats);
        default:
          performance.mark('fillPool.cycle');
          return augmentTimingTo(FillPoolResult.PoolFilled, stats);
      }
    },
    async (result) => augmentTimingTo(result)
  );
}
