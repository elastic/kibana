/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MlPluginSetup } from '@kbn/ml-plugin/server';
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
  anomalyDetectors: ReturnType<MlPluginSetup['anomalyDetectorsProvider']>
): Promise<ApmMlJob[]> {
  return withApmSpan('get_ml_jobs_with_apm_group', async () => {
    try {
      const [jobs, allJobStats, allDatafeedStats] = await Promise.all([
        anomalyDetectors
          .jobs(APM_ML_JOB_GROUP)
          .then((response) => response.jobs),
        anomalyDetectors
          .jobStats(APM_ML_JOB_GROUP)
          .then((response) => response.jobs)
          .catch(catch404),
        anomalyDetectors
          .datafeedStats(`datafeed-${APM_ML_JOB_GROUP}*`)
          .then((response) => response.datafeeds)
          .catch(catch404),
      ]);

      return jobs.map((job): ApmMlJob => {
        const jobStats = allJobStats.find(
          (stats) => stats.job_id === job.job_id
        );

        const datafeedStats = allDatafeedStats.find(
          (stats) => stats.datafeed_id === job.datafeed_config?.datafeed_id
        );

        return {
          environment: String(
            job.custom_settings?.job_tags?.environment
          ) as Environment,
          jobId: job.job_id,
          jobState: jobStats?.state as ApmMlJob['jobState'],
          version: Number(job.custom_settings?.job_tags?.apm_ml_version ?? 1),
          datafeedId: datafeedStats?.datafeed_id,
          datafeedState: datafeedStats?.state as ApmMlJob['datafeedState'],
        };
      });
    } catch (e) {
      return catch404(e) as ApmMlJob[];
    }
  });
}
