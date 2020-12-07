/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CombinedJobWithStats } from '../../../../../../ml/common/types/anomaly_detection_jobs';
import { HttpSetup } from '../../../../../../../../src/core/public';

export interface GetJobsArgs {
  http: HttpSetup;
  jobIds: string[];
  signal: AbortSignal;
}

/**
 * Fetches details for a set of ML jobs
 *
 * @param http HTTP Service
 * @param jobIds Array of job IDs to filter against
 * @param signal to cancel request
 *
 * @throws An error if response is not OK
 */
export const getJobs = async ({
  http,
  jobIds,
  signal,
}: GetJobsArgs): Promise<CombinedJobWithStats[]> =>
  http.fetch<CombinedJobWithStats[]>('/api/ml/jobs/jobs', {
    method: 'POST',
    body: JSON.stringify({ jobIds }),
    asSystemRequest: true,
    signal,
  });
