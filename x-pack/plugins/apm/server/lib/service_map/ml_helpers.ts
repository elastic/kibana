/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SERVICE_NAME } from '../../../common/elasticsearch_fieldnames';
import {
  getMlJobServiceName,
  getSeverity
} from '../../../common/ml_job_constants';
import { AnomaliesResponse, ServicesResponse } from './get_service_map';

export function addAnomaliesToServicesData(
  servicesData: ServicesResponse,
  anomaliesResponse: AnomaliesResponse
) {
  const anomaliesMap = (
    anomaliesResponse.aggregations?.jobs.buckets ?? []
  ).reduce<{
    [key: string]: { max_score?: number };
  }>((previousValue, currentValue) => {
    const key = getMlJobServiceName(currentValue.key.toString());

    return {
      ...previousValue,
      [key]: {
        max_score: Math.max(
          previousValue[key]?.max_score ?? 0,
          currentValue.max_score.value ?? 0
        )
      }
    };
  }, {});

  const servicesDataWithAnomalies = servicesData.map(service => {
    const score = anomaliesMap[service[SERVICE_NAME]]?.max_score;

    return {
      ...service,
      max_score: score,
      severity: getSeverity(score)
    };
  });

  return servicesDataWithAnomalies;
}
