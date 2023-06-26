/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface RetryOpts {
  times: number;
  intervalMs: number;
}

export async function retry<T>(
  cb: () => Promise<T>,
  options: RetryOpts = { times: 60, intervalMs: 500 }
) {
  let attempt = 1;
  while (true) {
    try {
      return await cb();
    } catch (e) {
      if (attempt >= options.times) {
        throw e;
      }
    }
    attempt++;
    await new Promise((resolve) => setTimeout(resolve, options.intervalMs));
  }
}
