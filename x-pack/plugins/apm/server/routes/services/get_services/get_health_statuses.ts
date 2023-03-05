/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ApmMlDetectorType } from '../../../../common/anomaly_detection/apm_ml_detectors';
import { Environment } from '../../../../common/environment_rt';
import { ServiceHealthStatus } from '../../../../common/service_health_status';
import { MlClient } from '../../../lib/helpers/get_ml_client';
import { getServiceAnomalies } from '../../service_map/get_service_anomalies';

interface AggregationParams {
  environment: Environment;
  mlClient?: MlClient;
  start: number;
  end: number;
}

export const getHealthStatuses = async ({
  environment,
  mlClient,
  start,
  end,
}: AggregationParams): Promise<
  Array<{ serviceName: string; healthStatus: ServiceHealthStatus }>
> => {
  if (!mlClient) {
    return [];
  }

  const anomalies = await getServiceAnomalies({
    mlClient,
    environment,
    start,
    end,
  });

  return anomalies.serviceAnomalies
    .filter((result) => result.type === ApmMlDetectorType.txLatency)
    .map((result) => ({
      serviceName: result.partition,
      healthStatus: result.healthStatus,
    }));
};
