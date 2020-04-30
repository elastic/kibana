/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  getMlJobServiceName,
  getSeverity
} from '../../../common/ml_job_constants';

export function addAnomaliesToServicesData(
  servicesData: any,
  anomaliesResponse: any
) {
  const anomaliesMap = anomaliesResponse.aggregations?.jobs.buckets.reduce(
    (previousValue, currentValue) => {
      const key = getMlJobServiceName(currentValue.key.toString());

      return {
        ...previousValue,
        [key]: {
          max_score: Math.max(
            previousValue[key]?.max_score ?? 0,
            currentValue.max_score.value
          )
        }
      };
    },
    {}
  );

  const servicesDataWithAnomalies = servicesData.map(service => {
    const score = anomaliesMap[service['service.name']]?.max_score;

    return {
      ...service,
      max_score: score,
      severity: getSeverity(score)
    };
  });

  return servicesDataWithAnomalies;
}
