/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from 'kibana/server';
import { MlPluginSetup } from '../../../../ml/server';
import { DetectionMetrics } from './types';
import { getMlJobMetrics, initialMlJobsUsage } from './detection_ml_helpers';

export const fetchDetectionsMetrics = async (
  soClient: SavedObjectsClientContract,
  mlClient: MlPluginSetup | undefined
): Promise<DetectionMetrics> => {
  const mlJobMetrics = await getMlJobMetrics(mlClient, soClient);

  return {
    ml_jobs: mlJobMetrics ? mlJobMetrics : { ml_job_metrics: [], ml_job_usage: initialMlJobsUsage },
  };
};
