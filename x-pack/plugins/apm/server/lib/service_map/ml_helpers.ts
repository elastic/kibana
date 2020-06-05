/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SERVICE_NAME } from '../../../common/elasticsearch_fieldnames';
import {
  getMlJobServiceName,
  getSeverity,
} from '../../../common/ml_job_constants';
import { ConnectionNode } from '../../../common/service_map';
import { AnomaliesResponse } from './get_service_map';

export function addAnomaliesDataToNodes(
  nodes: ConnectionNode[],
  anomaliesResponse: AnomaliesResponse
) {
  const anomaliesMap = (
    anomaliesResponse.aggregations?.jobs.buckets ?? []
  ).reduce<{
    [key: string]: {
      max_score?: number;
      actual_value?: number;
      typical_value?: number;
      job_id?: string;
    };
  }>((previousValue, currentValue) => {
    const key = getMlJobServiceName(currentValue.key.toString());
    const hitSource = currentValue.top_score_hits.hits.hits[0]._source as {
      record_score: number;
      actual: [number];
      typical: [number];
      job_id: string;
    };
    const maxScore = hitSource.record_score;
    const actualValue = hitSource.actual[0];
    const typicalValue = hitSource.typical[0];
    const jobId = hitSource.job_id;

    if ((previousValue[key]?.max_score ?? 0) > maxScore) {
      return previousValue;
    }

    return {
      ...previousValue,
      [key]: {
        max_score: maxScore,
        actual_value: actualValue,
        typical_value: typicalValue,
        job_id: jobId,
      },
    };
  }, {});

  const servicesDataWithAnomalies = nodes.map((service) => {
    const serviceAnomalies = anomaliesMap[service[SERVICE_NAME]];
    if (serviceAnomalies) {
      const maxScore = serviceAnomalies.max_score;
      return {
        ...service,
        max_score: maxScore,
        severity: getSeverity(maxScore),
        actual_value: serviceAnomalies.actual_value,
        typical_value: serviceAnomalies.typical_value,
        job_id: serviceAnomalies.job_id,
      };
    }
    return service;
  });

  return servicesDataWithAnomalies;
}
