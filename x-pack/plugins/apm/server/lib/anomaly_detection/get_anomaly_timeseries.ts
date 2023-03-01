/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import { ApmMlJobResultWithTimeseries } from '../../../common/anomaly_detection/apm_ml_job_result';
import { ApmMlModule } from '../../../common/anomaly_detection/apm_ml_module';
import { Environment } from '../../../common/environment_rt';
import type { MlClient } from '../helpers/get_ml_client';
import { getAnomalyResults } from './get_anomaly_results';

export async function getAnomalyTimeseries({
  partition,
  by,
  start,
  end,
  mlClient,
  environment,
  module,
  bucketSizeInSeconds,
}: {
  partition?: string;
  by?: string;
  start: number;
  end: number;
  environment: Environment;
  logger: Logger;
  mlClient: MlClient;
  module?: ApmMlModule;
  bucketSizeInSeconds: number | 'auto';
}): Promise<ApmMlJobResultWithTimeseries[]> {
  if (!mlClient) {
    return [];
  }

  return getAnomalyResults({
    partition,
    by,
    start,
    end,
    bucketSizeInSeconds,
    mlClient,
    environment,
    module,
  });
}
