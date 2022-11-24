/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { MlAnomalyDetectors } from '@kbn/ml-plugin/server';
import { ApmMlJob } from '../../../common/anomaly_detection/apm_ml_job';
import { Environment } from '../../../common/environment_rt';
import { withApmSpan } from '../../utils/with_apm_span';
import { APM_ML_JOB_GROUP } from './constants';

// returns ml jobs containing "apm" group
// workaround: the ML api returns 404 when no jobs are found. This is handled so instead of throwing an empty response is returned

function catch404(e: any) {
  if (e.statusCode === 404) {
    return [];
  }

  throw e;
}

export function getMlJobsWithAPMGroup(
  anomalyDetectors: MlAnomalyDetectors
): Promise<ApmMlJob[]> {
  return withApmSpan('get_ml_jobs_with_apm_group', async () => {
    try {
      const [{ jobs }, { jobs: jobStats }, { datafeeds: datafeedStats }] =
        await Promise.all([
          anomalyDetectors.jobs(APM_ML_JOB_GROUP),
          anomalyDetectors.jobStats(APM_ML_JOB_GROUP),
          anomalyDetectors.datafeedStats(`datafeed-${APM_ML_JOB_GROUP}*`),
        ]);

      const datafeedStateMap = datafeedStats.reduce<
        Record<string, estypes.MlDatafeedState>
      >((acc, cur) => {
        acc[cur.datafeed_id] = cur.state;
        return acc;
      }, {});
      const jobStateMap = jobStats.reduce<Record<string, estypes.MlJobState>>(
        (acc, cur) => {
          acc[cur.job_id] = cur.state;
          return acc;
        },
        {}
      );

      return jobs.map((job): ApmMlJob => {
        const jobId = job.job_id;
        const datafeedId = job.datafeed_config?.datafeed_id;
        return {
          jobId,
          jobState: jobStateMap[jobId],
          datafeedId,
          datafeedState: datafeedId ? datafeedStateMap[datafeedId] : undefined,
          version: Number(job?.custom_settings?.job_tags?.apm_ml_version ?? 1),
          environment: String(
            job?.custom_settings?.job_tags?.environment
          ) as Environment,
          bucketSpan: job?.analysis_config.bucket_span as string,
        };
      });
    } catch (e) {
      return catch404(e) as ApmMlJob[];
    }
  });
}
