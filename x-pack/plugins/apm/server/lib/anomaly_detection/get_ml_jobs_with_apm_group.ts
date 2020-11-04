/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MlPluginSetup } from '../../../../ml/server';
import { APM_ML_JOB_GROUP } from './constants';

// returns ml jobs containing "apm" group
// workaround: the ML api returns 404 when no jobs are found. This is handled so instead of throwing an empty response is returned
export async function getMlJobsWithAPMGroup(
  anomalyDetectors: ReturnType<MlPluginSetup['anomalyDetectorsProvider']>
) {
  try {
    return await anomalyDetectors.jobs(APM_ML_JOB_GROUP);
  } catch (e) {
    if (e.statusCode === 404) {
      return { count: 0, jobs: [] };
    }

    throw e;
  }
}
