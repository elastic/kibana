/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Logger } from 'kibana/server';
import { Setup } from '../helpers/setup_request';
import { ML_GROUP_NAME_APM } from './create_anomaly_detection_jobs';
import { hasLegacyJobs } from './has_legacy_jobs';

export async function getAnomalyDetectionJobs(setup: Setup, logger: Logger) {
  const { ml } = setup;
  if (!ml) {
    return;
  }

  const mlCapabilities = await ml.mlSystem.mlCapabilities();
  if (
    !(
      mlCapabilities.mlFeatureEnabledInSpace &&
      mlCapabilities.isPlatinumOrTrialLicense
    )
  ) {
    logger.warn('Anomaly detection integration is not availble for this user.');
    return;
  }

  const { jobs } = await ml.anomalyDetectors.jobs(ML_GROUP_NAME_APM);
  const apmJobs = jobs
    .map((job) => {
      const environment = job.custom_settings?.job_tags?.environment ?? '';
      return {
        job_id: job.job_id,
        environment,
      };
    })
    .filter((job) => job.environment);

  return {
    jobs: apmJobs,
    hasLegacyJobs: await hasLegacyJobs(setup),
  };
}
