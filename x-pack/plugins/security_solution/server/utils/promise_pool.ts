/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface PromisePoolArgs<Item, Result> {
  concurrency?: number;
  items: Item[];
  executor: (item: Item) => Promise<Result>;
}

/**
 * Runs promises in batches. It ensures that the number of running async tasks
 * doesn't exceed the concurrency parameter passed to the function.
 *
 * @param concurrency - number of tasks run in parallel
 * @param items - array of items to be passes to async executor
 * @param executor - an async function to be called with each provided item
 *
 * @returns Struct holding results or errors of async tasks
 */
export const initPromisePool = async <Item, Result>({
  concurrency = 1,
  items,
  executor,
}: PromisePoolArgs<Item, Result>) => {
  const tasks: Array<Promise<void>> = [];
  const results: Result[] = [];
  const errors: unknown[] = [];

  for (const item of items) {
    // Check if the pool is full
    if (tasks.length >= concurrency) {
      // Wait for any first task to finish
      await Promise.race(tasks);
    }

    const task: Promise<void> = executor(item)
      .then((result) => {
        results.push(result);
      })
      .catch(async (error) => {
        errors.push(error);
      })
      .finally(() => {
        tasks.splice(tasks.indexOf(task), 1);
      });

    tasks.push(task);
  }

  // Wait for all remaining tasks to finish
  await Promise.all(tasks);

  return { results, errors };
};
