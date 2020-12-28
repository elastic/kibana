/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getSeverity } from '../../../../common/anomaly_detection';
import { getServiceHealthStatus } from '../../../../common/service_health_status';
import {
  getMLJobIds,
  getServiceAnomalies,
} from '../../service_map/get_service_anomalies';
import {
  ServicesItemsProjection,
  ServicesItemsSetup,
} from './get_services_items';

interface AggregationParams {
  setup: ServicesItemsSetup;
  projection: ServicesItemsProjection;
  searchAggregatedTransactions: boolean;
}

export const getHealthStatuses = async (
  { setup }: AggregationParams,
  mlAnomaliesEnvironment?: string
) => {
  if (!setup.ml) {
    return [];
  }

  const jobIds = await getMLJobIds(
    setup.ml.anomalyDetectors,
    mlAnomaliesEnvironment
  );
  if (!jobIds.length) {
    return [];
  }

  const anomalies = await getServiceAnomalies({
    setup,
    environment: mlAnomaliesEnvironment,
  });

  return Object.keys(anomalies.serviceAnomalies).map((serviceName) => {
    const stats = anomalies.serviceAnomalies[serviceName];

    const severity = getSeverity(stats.anomalyScore);
    const healthStatus = getServiceHealthStatus({ severity });

    return {
      serviceName,
      healthStatus,
    };
  });
};
