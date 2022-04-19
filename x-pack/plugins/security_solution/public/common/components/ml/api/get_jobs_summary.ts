/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpSetup } from '@kbn/core/public';
import { MlSummaryJob } from '@kbn/ml-plugin/public';

export interface GetJobsSummaryArgs {
  http: HttpSetup;
  jobIds?: string[];
  signal: AbortSignal;
}

/**
 * Fetches a summary of all ML jobs currently installed
 *
 * @param http HTTP Service
 * @param jobIds Array of job IDs to filter against
 * @param signal to cancel request
 *
 * @throws An error if response is not OK
 */
export const getJobsSummary = async ({
  http,
  jobIds,
  signal,
}: GetJobsSummaryArgs): Promise<MlSummaryJob[]> =>
  http.fetch<MlSummaryJob[]>('/api/ml/jobs/jobs_summary', {
    method: 'POST',
    body: JSON.stringify({ jobIds: jobIds ?? [] }),
    asSystemRequest: true,
    signal,
  });
