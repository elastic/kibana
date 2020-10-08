/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export function timeoutPromiseAfter<T, G>(
  future: Promise<T>,
  ms: number,
  onTimeout: () => G
): Promise<T> {
  return new Promise((resolve, reject) => {
    setTimeout(() => reject(onTimeout()), ms);
    future.then(resolve).catch(reject);
  });
}
