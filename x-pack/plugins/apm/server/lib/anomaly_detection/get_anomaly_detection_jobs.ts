/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Logger } from 'kibana/server';
import Boom from 'boom';
import { ML_ERRORS } from '../../../common/anomaly_detection';
import { Setup } from '../helpers/setup_request';
import { getMlJobsWithAPMGroup } from './get_ml_jobs_with_apm_group';

export async function getAnomalyDetectionJobs(setup: Setup, logger: Logger) {
  const { ml } = setup;

  if (!ml) {
    throw Boom.notImplemented(ML_ERRORS.ML_NOT_AVAILABLE);
  }

  const mlCapabilities = await ml.mlSystem.mlCapabilities();
  if (!mlCapabilities.mlFeatureEnabledInSpace) {
    throw Boom.forbidden(ML_ERRORS.ML_NOT_AVAILABLE_IN_SPACE);
  }

  const response = await getMlJobsWithAPMGroup(ml.anomalyDetectors);
  return response.jobs
    .filter((job) => (job.custom_settings?.job_tags?.apm_ml_version ?? 0) >= 2)
    .map((job) => {
      const environment = job.custom_settings?.job_tags?.environment ?? '';
      return {
        job_id: job.job_id,
        environment,
      };
    });
}
