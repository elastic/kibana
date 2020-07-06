/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Logger } from 'kibana/server';
import { PromiseReturnType } from '../../../../observability/typings/common';
import { Setup } from '../helpers/setup_request';
import { AnomalyDetectionJobByEnv } from '../../../typings/anomaly_detection';
import { ML_GROUP_NAME_APM } from './create_anomaly_detection_jobs';

export type AnomalyDetectionJobsAPIResponse = PromiseReturnType<
  typeof getAnomalyDetectionJobs
>;
export async function getAnomalyDetectionJobs(
  setup: Setup,
  logger: Logger
): Promise<AnomalyDetectionJobByEnv[]> {
  const { ml } = setup;
  if (!ml) {
    return [];
  }
  try {
    const mlCapabilities = await ml.mlSystem.mlCapabilities();
    if (
      !(
        mlCapabilities.mlFeatureEnabledInSpace &&
        mlCapabilities.isPlatinumOrTrialLicense
      )
    ) {
      logger.warn(
        'Anomaly detection integration is not availble for this user.'
      );
      return [];
    }
  } catch (error) {
    logger.warn('Unable to get ML capabilities.');
    logger.error(error);
    return [];
  }
  try {
    const { jobs } = await ml.anomalyDetectors.jobs(ML_GROUP_NAME_APM);
    return jobs
      .map((job) => {
        const environment = job.custom_settings?.job_tags?.environment ?? '';
        return {
          job_id: job.job_id,
          environment,
        };
      })
      .filter((job) => job.environment);
  } catch (error) {
    if (error.statusCode !== 404) {
      logger.warn('Unable to get APM ML jobs.');
      logger.error(error);
    }
    return [];
  }
}
