/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import Boom from '@hapi/boom';
import { ML_ERRORS } from '../../../common/anomaly_detection';
import { MlSetup } from '../helpers/get_ml_setup';
import { getMlJobsWithAPMGroup } from './get_ml_jobs_with_apm_group';

export function getAnomalyDetectionJobs(mlSetup?: MlSetup) {
  if (!mlSetup) {
    throw Boom.notImplemented(ML_ERRORS.ML_NOT_AVAILABLE);
  }

  return getMlJobsWithAPMGroup(mlSetup.anomalyDetectors);
}
