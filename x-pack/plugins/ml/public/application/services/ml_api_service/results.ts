/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// Service for obtaining data for the ML Results dashboards.
import { GetStoppedPartitionResult } from '../../../../common/types/results';
import { HttpService } from '../http_service';
import { basePath } from './index';
import { JobId } from '../../../../common/types/anomaly_detection_jobs';
import { JOB_ID, PARTITION_FIELD_VALUE } from '../../../../common/constants/anomalies';
import { PartitionFieldsDefinition } from '../results_service/result_service_rx';

export const resultsApiProvider = (httpService: HttpService) => ({
  getAnomaliesTableData(
    jobIds: string[],
    criteriaFields: string[],
    influencers: string[],
    aggregationInterval: string,
    threshold: number,
    earliestMs: number,
    latestMs: number,
    dateFormatTz: string,
    maxRecords: number,
    maxExamples: number,
    influencersFilterQuery: any
  ) {
    const body = JSON.stringify({
      jobIds,
      criteriaFields,
      influencers,
      aggregationInterval,
      threshold,
      earliestMs,
      latestMs,
      dateFormatTz,
      maxRecords,
      maxExamples,
      influencersFilterQuery,
    });

    return httpService.http$<any>({
      path: `${basePath()}/results/anomalies_table_data`,
      method: 'POST',
      body,
    });
  },

  getMaxAnomalyScore(jobIds: string[], earliestMs: number, latestMs: number) {
    const body = JSON.stringify({
      jobIds,
      earliestMs,
      latestMs,
    });
    return httpService.http<any>({
      path: `${basePath()}/results/max_anomaly_score`,
      method: 'POST',
      body,
    });
  },

  getCategoryDefinition(jobId: string, categoryId: string) {
    const body = JSON.stringify({ jobId, categoryId });
    return httpService.http<any>({
      path: `${basePath()}/results/category_definition`,
      method: 'POST',
      body,
    });
  },

  getCategoryExamples(jobId: string, categoryIds: string[], maxExamples: number) {
    const body = JSON.stringify({
      jobId,
      categoryIds,
      maxExamples,
    });
    return httpService.http<any>({
      path: `${basePath()}/results/category_examples`,
      method: 'POST',
      body,
    });
  },

  fetchPartitionFieldsValues(
    jobId: JobId,
    searchTerm: Record<string, string>,
    criteriaFields: Array<{ fieldName: string; fieldValue: any }>,
    earliestMs: number,
    latestMs: number
  ) {
    const body = JSON.stringify({ jobId, searchTerm, criteriaFields, earliestMs, latestMs });
    return httpService.http$<PartitionFieldsDefinition>({
      path: `${basePath()}/results/partition_fields_values`,
      method: 'POST',
      body,
    });
  },

  anomalySearch(obj: any) {
    const body = JSON.stringify(obj);
    return httpService.http<any>({
      path: `${basePath()}/results/anomaly_search`,
      method: 'POST',
      body,
    });
  },

  anomalySearch$(obj: any) {
    const body = JSON.stringify(obj);
    return httpService.http$<any>({
      path: `${basePath()}/results/anomaly_search`,
      method: 'POST',
      body,
    });
  },

  getCategoryStoppedPartitions(
    jobIds: string[],
    fieldToBucket?: typeof JOB_ID | typeof PARTITION_FIELD_VALUE
  ) {
    const body = JSON.stringify({
      jobIds,
      fieldToBucket,
    });
    return httpService.http<GetStoppedPartitionResult>({
      path: `${basePath()}/results/category_stopped_partitions`,
      method: 'POST',
      body,
    });
  },
});
