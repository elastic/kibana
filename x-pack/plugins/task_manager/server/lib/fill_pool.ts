/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { performance } from 'perf_hooks';
import { TaskTiming, startTaskTimer } from '../task_events';
import { TaskPoolRunResult } from '../task_pool';
import { Result, map } from './result_type';

export enum FillPoolResult {
  Failed = 'Failed',
  NoAvailableWorkers = 'NoAvailableWorkers',
  NoTasksClaimed = 'NoTasksClaimed',
  RunningAtCapacity = 'RunningAtCapacity',
  RanOutOfCapacity = 'RanOutOfCapacity',
  PoolFilled = 'PoolFilled',
}

type BatchRun<T> = (tasks: T[]) => Promise<TaskPoolRunResult>;
type Fetcher<T, E> = () => Promise<Result<T[], E>>;
type Converter<T1, T2> = (t: T1) => T2;

export interface TimedFillPoolResult {
  result: FillPoolResult;
  timing: TaskTiming;
}
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
export async function fillPool<TRecord, TRunner>(
  fetchAvailableTasks: Fetcher<TRecord, FillPoolResult>,
  converter: Converter<TRecord, TRunner>,
  run: BatchRun<TRunner>
): Promise<TimedFillPoolResult> {
  performance.mark('fillPool.start');
  const stopTaskTimer = startTaskTimer();
  const augmentTimingTo = (result: FillPoolResult): TimedFillPoolResult => ({
    result,
    timing: stopTaskTimer(),
  });
  return map<TRecord[], FillPoolResult, Promise<TimedFillPoolResult>>(
    await fetchAvailableTasks(),
    async (instances) => {
      if (!instances.length) {
        performance.mark('fillPool.bailNoTasks');
        performance.measure(
          'fillPool.activityDurationUntilNoTasks',
          'fillPool.start',
          'fillPool.bailNoTasks'
        );
        return augmentTimingTo(FillPoolResult.NoTasksClaimed);
      }

      const tasks = instances.map(converter);

      switch (await run(tasks)) {
        case TaskPoolRunResult.RanOutOfCapacity:
          performance.mark('fillPool.bailExhaustedCapacity');
          performance.measure(
            'fillPool.activityDurationUntilExhaustedCapacity',
            'fillPool.start',
            'fillPool.bailExhaustedCapacity'
          );
          return augmentTimingTo(FillPoolResult.RanOutOfCapacity);
        case TaskPoolRunResult.RunningAtCapacity:
          performance.mark('fillPool.cycle');
          return augmentTimingTo(FillPoolResult.RunningAtCapacity);
        default:
          performance.mark('fillPool.cycle');
          return augmentTimingTo(FillPoolResult.PoolFilled);
      }
    },
    async (result) => augmentTimingTo(result)
  );
}
