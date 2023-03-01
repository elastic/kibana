/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ApmMlJobResultWithTimeseries } from '../../../../common/anomaly_detection/apm_ml_job_result';
import { ApmMlModule } from '../../../../common/anomaly_detection/apm_ml_module';
import { Environment } from '../../../../common/environment_rt';
import { getAnomalyResults } from '../../../lib/anomaly_detection/get_anomaly_results';
import { MlClient } from '../../../lib/helpers/get_ml_client';

export type ServiceSummaryAnomalyStats = ApmMlJobResultWithTimeseries[];

export async function getServiceSummaryAnomalies({
  serviceName,
  start,
  end,
  environment,
  mlClient,
  bucketSizeInSeconds,
  by,
  module,
}: {
  serviceName: string;
  start: number;
  end: number;
  environment: Environment;
  mlClient: MlClient;
  bucketSizeInSeconds: number;
  by: string | null;
  module: ApmMlModule;
}): Promise<ServiceSummaryAnomalyStats> {
  const results = await getAnomalyResults({
    partition: serviceName,
    by: by ?? undefined,
    start,
    end,
    environment,
    mlClient,
    bucketSizeInSeconds,
    module,
  });

  return results;
}
