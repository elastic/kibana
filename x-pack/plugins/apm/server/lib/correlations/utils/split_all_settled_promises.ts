/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface HandledPromises<T> {
  fulfilled: T[];
  rejected: unknown[];
}

export const splitAllSettledPromises = <T = unknown>(
  promises: Array<PromiseSettledResult<T>>
): HandledPromises<T> =>
  promises.reduce(
    (result, current) => {
      if (current.status === 'fulfilled') {
        result.fulfilled.push(current.value as T);
      } else if (current.status === 'rejected') {
        result.rejected.push(current.reason);
      }
      return result;
    },
    {
      fulfilled: [],
      rejected: [],
    } as HandledPromises<T>
  );
