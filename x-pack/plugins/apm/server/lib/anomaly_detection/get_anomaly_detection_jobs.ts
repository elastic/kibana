/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Logger } from 'kibana/server';
import { Job as AnomalyDetectionJob } from '../../../../ml/server';
import { PromiseReturnType } from '../../../../observability/typings/common';
import { Setup } from '../helpers/setup_request';
import { AnomalyDetectionJobByEnv } from '../../../typings/anomaly_detection';

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
  const mlCapabilities = await ml.mlSystem.mlCapabilities();
  if (
    !(
      mlCapabilities.mlFeatureEnabledInSpace &&
      mlCapabilities.isPlatinumOrTrialLicense
    )
  ) {
    logger.warn('Anomaly detection integration is not availble for this user.');
    return [];
  }
  let mlJobs: AnomalyDetectionJob[] = [];
  try {
    mlJobs = (await ml.anomalyDetectors.jobs('apm')).jobs;
  } catch (error) {
    // if (error.statusCode === 404) {
    //   return [];
    // }
  }
  // return mlJobs.map(...)
  const exampleApmJobsByEnv: AnomalyDetectionJobByEnv[] = [
    {
      'service.environment': 'prod',
      job_id: 'apm-prod-high_mean_response_time',
    },
    { 'service.environment': 'dev', job_id: 'apm-dev-high_mean_response_time' },
    { 'service.environment': 'new', job_id: 'apm-new-high_mean_response_time' },
  ];
  return exampleApmJobsByEnv;
}
