/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import type { MlAnomalyDetectors } from '../../types';
import { startTracingSpan } from '../../../common/performance_tracing';
import { NoLogAnalysisMlJobError } from './errors';

export async function fetchMlJob(mlAnomalyDetectors: MlAnomalyDetectors, jobId: string) {
  const finalizeMlGetJobSpan = startTracingSpan('Fetch ml job from ES');
  const {
    jobs: [mlJob],
  } = await mlAnomalyDetectors.jobs(jobId);

  const mlGetJobSpan = finalizeMlGetJobSpan();

  if (mlJob == null) {
    throw new NoLogAnalysisMlJobError(`Failed to find ml job ${jobId}.`);
  }

  return {
    mlJob,
    timing: {
      spans: [mlGetJobSpan],
    },
  };
}
