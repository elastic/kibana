/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { MlGetJobsResponse, MlPutJobRequest } from '@elastic/elasticsearch/lib/api/types';
import type { ScoutLogger } from '@kbn/scout';

export async function cleanupMachineLearningJobs({
  esClient,
  log,
}: {
  esClient: Client;
  log: ScoutLogger;
}) {
  const jobs: MlGetJobsResponse = await esClient.ml.getJobs();
  try {
    for (const job of jobs.jobs) {
      const datafeedId = job.datafeed_config?.datafeed_id;
      const jobId = job.job_id;
      if (datafeedId) {
        await esClient.ml.stopDatafeed({ datafeed_id: datafeedId, force: true });
        await esClient.ml.deleteDatafeed({ datafeed_id: datafeedId });
      }
      await esClient.ml.closeJob({ job_id: jobId, force: true });
      await esClient.ml.deleteJob({ job_id: jobId });
    }
  } catch (error) {
    log.info('Cleanup warning:', error);
  }
}

export async function setupMLJobAndDatafeed(
  esClient: Client,
  mlJobRequest: MlPutJobRequest,
  jobId: string,
  datafeedId: string,
  start: string = 'now-1h'
) {
  await esClient.ml.putJob(mlJobRequest);
  await esClient.ml.openJob({ job_id: jobId });
  await esClient.ml.startDatafeed({
    datafeed_id: datafeedId,
    start,
  });
}
