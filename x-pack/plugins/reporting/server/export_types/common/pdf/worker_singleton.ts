/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Worker } from 'worker_threads';

let worker: undefined | Worker;

interface GetWorkerInstanceArgs {
  modulePath: string;
  maxYoungHeapSizeMb: undefined | number;
  maxOldHeapSizeMb: number;
}

/**
 * Return a long-lived worker instance
 */
export function getWorkerInstance({
  modulePath,
  maxYoungHeapSizeMb,
  maxOldHeapSizeMb,
}: GetWorkerInstanceArgs): Worker {
  if (!worker) {
    worker = new Worker(modulePath, {
      resourceLimits: {
        maxYoungGenerationSizeMb: maxYoungHeapSizeMb,
        maxOldGenerationSizeMb: maxOldHeapSizeMb,
      },
    });

    worker.on('error', () => {
      // If the worker encounters an error, we must re-create it, so clear the
      // the singleton so that it can be re-instantiated.
      worker = undefined;
    });
  }

  return worker;
}
