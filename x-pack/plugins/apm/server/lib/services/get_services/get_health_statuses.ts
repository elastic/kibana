/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSeverity } from '../../../../common/anomaly_detection';
import { getServiceHealthStatus } from '../../../../common/service_health_status';
import { getServiceAnomalies } from '../../service_map/get_service_anomalies';
import { ServicesItemsSetup } from './get_services_items';

interface AggregationParams {
  environment?: string;
  setup: ServicesItemsSetup;
  searchAggregatedTransactions: boolean;
}

export const getHealthStatuses = async ({
  environment,
  setup,
}: AggregationParams) => {
  if (!setup.ml) {
    return [];
  }

  const anomalies = await getServiceAnomalies({
    setup,
    environment,
  });

  return anomalies.serviceAnomalies.map((anomalyStats) => {
    const severity = getSeverity(anomalyStats.anomalyScore);
    const healthStatus = getServiceHealthStatus({ severity });
    return {
      serviceName: anomalyStats.serviceName,
      healthStatus,
    };
  });
};
