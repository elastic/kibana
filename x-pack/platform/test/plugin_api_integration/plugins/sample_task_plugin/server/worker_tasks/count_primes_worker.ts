/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkerTaskInput, WorkerRunResult } from '@kbn/task-manager-plugin/server/task';
import countPrimes from './count_primes';

/**
 * Worker module for `sampleWorkerTask`, a fully worker-run task type registered via
 * `workerModuleId`. Runs entirely in a dedicated worker process with no Kibana services -
 * only structured-cloneable input/output crosses the process boundary.
 */

export default function countPrimesWorker({ taskInstance }: WorkerTaskInput): WorkerRunResult {
  if (taskInstance.params.failWith) {
    return {
      state: taskInstance.state,
      error: { message: String(taskInstance.params.failWith) },
    };
  }

  const limit = Number(taskInstance.params.limit) || 1000;
  const { primeCount } = countPrimes({ limit });
  return { state: { limit, primeCount } };
}
