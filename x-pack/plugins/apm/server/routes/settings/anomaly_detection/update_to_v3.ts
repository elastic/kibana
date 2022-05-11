/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Logger } from '@kbn/logging';
import { uniq } from 'lodash';
import pLimit from 'p-limit';
import { ElasticsearchClient } from '@kbn/core/server';
import { JOB_STATE } from '@kbn/ml-plugin/common';
import { createAnomalyDetectionJobs } from '../../../lib/anomaly_detection/create_anomaly_detection_jobs';
import { getAnomalyDetectionJobs } from '../../../lib/anomaly_detection/get_anomaly_detection_jobs';
import { Setup } from '../../../lib/helpers/setup_request';
import { withApmSpan } from '../../../utils/with_apm_span';

export async function updateToV3({
  logger,
  setup,
  esClient,
}: {
  logger: Logger;
  setup: Setup;
  esClient: ElasticsearchClient;
}) {
  const allJobs = await getAnomalyDetectionJobs(setup);

  const v2Jobs = allJobs.filter((job) => job.version === 2);

  const activeV2Jobs = v2Jobs.filter(
    (job) =>
      job.jobState === JOB_STATE.OPENED || job.jobState === JOB_STATE.OPENING
  );

  const environments = uniq(v2Jobs.map((job) => job.environment));

  const limiter = pLimit(3);

  if (!v2Jobs.length) {
    return true;
  }

  if (activeV2Jobs.length) {
    await withApmSpan('anomaly_detection_stop_v2_jobs', () =>
      Promise.all(
        activeV2Jobs.map((job) =>
          limiter(() => {
            return esClient.ml.closeJob({
              job_id: job.jobId,
            });
          })
        )
      )
    );
  }

  await createAnomalyDetectionJobs(setup, environments, logger);

  return true;
}
