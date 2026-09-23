/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createFlagError } from '@kbn/dev-cli-errors';
import type { EvalSuiteRunConfig } from '@kbn/evals';

export const runConfig: EvalSuiteRunConfig = {
  options: ['dataset-id', 'concurrency'],
  resolve: ({ options, env }) => {
    const datasetId = options['dataset-id'] ?? env.NIGHTSHIFT_DATASET_ID;
    const selection =
      datasetId || options.concurrency !== undefined
        ? 'trace-only'
        : env.NIGHTSHIFT_DATASETS ?? 'synthetic-smoke';
    if (!['all', 'synthetic-smoke', 'trace-only'].includes(selection)) {
      throw createFlagError('NIGHTSHIFT_DATASETS must be synthetic-smoke or trace-only.');
    }
    const server = { NIGHTSHIFT_DATASETS: selection };
    if (selection !== 'trace-only') return { playwright: server, server };
    if (datasetId && env.NIGHTSHIFT_EXAMPLES_FILE) {
      throw createFlagError('Choose either --dataset-id or NIGHTSHIFT_EXAMPLES_FILE, not both');
    }
    const concurrency = Number(options.concurrency ?? env.NIGHTSHIFT_CONCURRENCY ?? 2);
    if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 45) {
      throw createFlagError('--concurrency must be an integer between 1 and 45');
    }
    const serverEnv = { ...server, NIGHTSHIFT_CONCURRENCY: String(concurrency) };
    return {
      server: serverEnv,
      playwright: {
        ...serverEnv,
        ...(datasetId ? { NIGHTSHIFT_DATASET_ID: datasetId } : {}),
      },
    };
  },
};
