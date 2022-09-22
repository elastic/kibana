/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';

export async function logExecutionLatency<T>(
  logger: Logger,
  activity: string,
  func: () => Promise<T>
): Promise<T> {
  const start = Date.now();
  return await func().then((res) => {
    logger.info(activity + ' took ' + (Date.now() - start) + 'ms');
    return res;
  });
}
