/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SERVICE_NAME } from '../../../common/elasticsearch_fieldnames';
import { getSeverity } from '../../../common/ml_job_constants';
import { ConnectionNode } from '../../../common/service_map';
import { ServiceAnomalies } from './get_service_map';

export function addAnomaliesDataToNodes(
  nodes: ConnectionNode[],
  serviceAnomalies: ServiceAnomalies
) {
  const anomaliesMap = serviceAnomalies.reduce(
    (acc, anomalyJob) => {
      const serviceAnomaly: typeof acc[string] | undefined =
        acc[anomalyJob.serviceName];
      const hasAnomalyJob = serviceAnomaly !== undefined;
      const hasAnomalyScore = serviceAnomaly?.anomaly_score !== undefined;
      const hasNewAnomalyScore = anomalyJob.anomalyScore !== undefined;
      const hasNewMaxAnomalyScore =
        hasNewAnomalyScore &&
        (!hasAnomalyScore ||
          (anomalyJob?.anomalyScore ?? 0) >
            (serviceAnomaly?.anomaly_score ?? 0));

      if (!hasAnomalyJob || hasNewMaxAnomalyScore) {
        acc[anomalyJob.serviceName] = {
          anomaly_score: anomalyJob.anomalyScore,
          actual_value: anomalyJob.actual,
          typical_value: anomalyJob.typical,
          ml_job_id: anomalyJob.jobId,
        };
      }

      return acc;
    },
    {} as {
      [serviceName: string]: {
        anomaly_score?: number;
        actual_value?: number;
        typical_value?: number;
        ml_job_id: string;
      };
    }
  );

  const servicesDataWithAnomalies = nodes.map((service) => {
    const serviceAnomaly = anomaliesMap[service[SERVICE_NAME]];
    if (serviceAnomaly) {
      const anomalyScore = serviceAnomaly.anomaly_score;
      return {
        ...service,
        anomaly_score: anomalyScore,
        anomaly_severity: getSeverity(anomalyScore),
        actual_value: serviceAnomaly.actual_value,
        typical_value: serviceAnomaly.typical_value,
        ml_job_id: serviceAnomaly.ml_job_id,
      };
    }
    return service;
  });

  return servicesDataWithAnomalies;
}
