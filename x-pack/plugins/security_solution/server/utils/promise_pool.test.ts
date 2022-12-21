/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AbortError } from '@kbn/kibana-utils-plugin/common';
import { initPromisePool } from './promise_pool';

const nextTick = () => new Promise((resolve) => setImmediate(resolve));

const initPoolWithTasks = ({ concurrency = 1, items = [1, 2, 3] }, abortSignal?: AbortSignal) => {
  const asyncTasks: Record<
    number,
    {
      status: 'pending' | 'resolved' | 'rejected';
      resolve: () => void;
      reject: () => void;
    }
  > = {};

  const promisePool = initPromisePool({
    concurrency,
    items,
    executor: async (x) =>
      new Promise((resolve, reject) => {
        asyncTasks[x] = {
          status: 'pending',
          resolve: () => {
            asyncTasks[x].status = 'resolved';
            resolve(x);
          },
          reject: () => {
            asyncTasks[x].status = 'rejected';
            reject(new Error(`Error processing ${x}`));
          },
        };
      }),
    abortSignal,
  });

  return [promisePool, asyncTasks] as const;
};

describe('initPromisePool', () => {
  it('should execute async tasks', async () => {
    const { results, errors } = await initPromisePool({
      concurrency: 1,
      items: [1, 2, 3],
      executor: async (x) => x,
    });

    expect(results).toEqual([
      { item: 1, result: 1 },
      { item: 2, result: 2 },
      { item: 3, result: 3 },
    ]);
    expect(errors).toEqual([]);
  });

  it('should capture any errors that occur during tasks execution', async () => {
    const { results, errors } = await initPromisePool({
      concurrency: 1,
      items: [1, 2, 3],
      executor: async (x) => {
        throw new Error(`Error processing ${x}`);
      },
    });

    expect(results).toEqual([]);
    expect(errors).toEqual([
      { item: 1, error: new Error(`Error processing 1`) },
      { item: 2, error: new Error(`Error processing 2`) },
      { item: 3, error: new Error(`Error processing 3`) },
    ]);
  });

  it('should respect concurrency', async () => {
    const [promisePool, asyncTasks] = initPoolWithTasks({
      concurrency: 1,
      items: [1, 2, 3],
    });

    // Check that we have only one task pending initially as concurrency = 1
    expect(asyncTasks).toEqual({
      1: expect.objectContaining({ status: 'pending' }),
    });

    asyncTasks[1].resolve();
    await nextTick();

    // Check that after resolving the first task, the second is pending
    expect(asyncTasks).toEqual({
      1: expect.objectContaining({ status: 'resolved' }),
      2: expect.objectContaining({ status: 'pending' }),
    });

    asyncTasks[2].reject();
    await nextTick();

    // Check that after rejecting the second task, the third is pending
    expect(asyncTasks).toEqual({
      1: expect.objectContaining({ status: 'resolved' }),
      2: expect.objectContaining({ status: 'rejected' }),
      3: expect.objectContaining({ status: 'pending' }),
    });

    asyncTasks[3].resolve();
    await nextTick();

    // Check that all tasks have been settled
    expect(asyncTasks).toEqual({
      1: expect.objectContaining({ status: 'resolved' }),
      2: expect.objectContaining({ status: 'rejected' }),
      3: expect.objectContaining({ status: 'resolved' }),
    });

    const { results, errors } = await promisePool;

    // Check final results
    expect(results).toEqual([
      { item: 1, result: 1 },
      { item: 3, result: 3 },
    ]);
    expect(errors).toEqual([{ item: 2, error: new Error(`Error processing 2`) }]);
  });

  it('should be possible to configure concurrency', async () => {
    const [promisePool, asyncTasks] = initPoolWithTasks({
      concurrency: 2,
      items: [1, 2, 3, 4, 5],
    });

    // Check that we have only two tasks pending initially as concurrency = 2
    expect(asyncTasks).toEqual({
      1: expect.objectContaining({ status: 'pending' }),
      2: expect.objectContaining({ status: 'pending' }),
    });

    asyncTasks[1].resolve();
    await nextTick();

    // Check that after resolving the first task, the second and the third is pending
    expect(asyncTasks).toEqual({
      1: expect.objectContaining({ status: 'resolved' }),
      2: expect.objectContaining({ status: 'pending' }),
      3: expect.objectContaining({ status: 'pending' }),
    });

    asyncTasks[2].reject();
    asyncTasks[3].reject();
    await nextTick();

    // Check that after rejecting the second and the third tasks, the rest are pending
    expect(asyncTasks).toEqual({
      1: expect.objectContaining({ status: 'resolved' }),
      2: expect.objectContaining({ status: 'rejected' }),
      3: expect.objectContaining({ status: 'rejected' }),
      4: expect.objectContaining({ status: 'pending' }),
      5: expect.objectContaining({ status: 'pending' }),
    });

    asyncTasks[4].resolve();
    asyncTasks[5].resolve();
    await nextTick();

    // Check that all tasks have been settled
    expect(asyncTasks).toEqual({
      1: expect.objectContaining({ status: 'resolved' }),
      2: expect.objectContaining({ status: 'rejected' }),
      3: expect.objectContaining({ status: 'rejected' }),
      4: expect.objectContaining({ status: 'resolved' }),
      5: expect.objectContaining({ status: 'resolved' }),
    });

    const { results, errors } = await promisePool;

    // Check final results
    expect(results).toEqual([
      { item: 1, result: 1 },
      { item: 4, result: 4 },
      { item: 5, result: 5 },
    ]);
    expect(errors).toEqual([
      { item: 2, error: new Error(`Error processing 2`) },
      { item: 3, error: new Error(`Error processing 3`) },
    ]);
  });

  it('should not execute tasks if abortSignal is aborted', async () => {
    const abortSignal = { aborted: true };
    const [promisePool] = initPoolWithTasks(
      {
        concurrency: 2,
        items: [1, 2, 3, 4, 5],
      },
      abortSignal as AbortSignal
    );

    const { results, errors } = await promisePool;

    // Check final results
    expect(results).toEqual([]);
    expect(errors).toEqual([
      { item: 1, error: new AbortError() },
      { item: 2, error: new AbortError() },
      { item: 3, error: new AbortError() },
      { item: 4, error: new AbortError() },
      { item: 5, error: new AbortError() },
    ]);
  });

  it('should abort executions of tasks if abortSignal was set to aborted during execution', async () => {
    const abortSignal = { aborted: false };
    const [promisePool, asyncTasks] = initPoolWithTasks(
      {
        concurrency: 1,
        items: [1, 2, 3],
      },
      abortSignal as AbortSignal
    );

    // resolve first task, and abort execution
    asyncTasks[1].resolve();
    expect(asyncTasks).toEqual({
      1: expect.objectContaining({ status: 'resolved' }),
    });

    abortSignal.aborted = true;

    const { results, errors } = await promisePool;

    // Check final results
    expect(results).toEqual([{ item: 1, result: 1 }]);
    expect(errors).toEqual([
      { item: 2, error: new AbortError() },
      { item: 3, error: new AbortError() },
    ]);
  });
});
