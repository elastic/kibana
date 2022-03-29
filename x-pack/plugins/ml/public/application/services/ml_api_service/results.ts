/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Service for obtaining data for the ML Results dashboards.
import { HttpService } from '../http_service';
import { basePath } from './index';
import { JOB_ID, PARTITION_FIELD_VALUE } from '../../../../common/constants/anomalies';
import type {
  GetStoppedPartitionResult,
  GetDatafeedResultsChartDataResult,
} from '../../../../common/types/results';
import type { JobId } from '../../../../common/types/anomaly_detection_jobs';
import type { PartitionFieldsDefinition } from '../results_service/result_service_rx';
import type { PartitionFieldsConfig } from '../../../../common/types/storage';
import type {
  ESSearchRequest,
  ESSearchResponse,
} from '../../../../../../../src/core/types/elasticsearch';
import type { MLAnomalyDoc } from '../../../../common/types/anomalies';
import type { EntityField } from '../../../../common/util/anomaly_utils';
import type { InfluencersFilterQuery } from '../../../../common/types/es_client';
import type { ExplorerChartsData } from '../../../../common/types/results';

export type ResultsApiService = ReturnType<typeof resultsApiProvider>;

export const resultsApiProvider = (httpService: HttpService) => ({
  getAnomaliesTableData(
    jobIds: string[],
    criteriaFields: string[],
    influencers: EntityField[],
    aggregationInterval: string,
    threshold: number,
    earliestMs: number,
    latestMs: number,
    dateFormatTz: string,
    maxRecords: number,
    maxExamples?: number,
    influencersFilterQuery?: any,
    functionDescription?: string
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
      functionDescription,
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
    latestMs: number,
    fieldsConfig?: PartitionFieldsConfig
  ) {
    const body = JSON.stringify({
      jobId,
      searchTerm,
      criteriaFields,
      earliestMs,
      latestMs,
      fieldsConfig,
    });
    return httpService.http$<PartitionFieldsDefinition>({
      path: `${basePath()}/results/partition_fields_values`,
      method: 'POST',
      body,
    });
  },

  anomalySearch(query: ESSearchRequest, jobIds: string[]) {
    const body = JSON.stringify({ query, jobIds });
    return httpService.http<ESSearchResponse<MLAnomalyDoc>>({
      path: `${basePath()}/results/anomaly_search`,
      method: 'POST',
      body,
    });
  },

  anomalySearch$(query: ESSearchRequest, jobIds: string[]) {
    const body = JSON.stringify({ query, jobIds });
    return httpService.http$<ESSearchResponse<MLAnomalyDoc>>({
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

  getDatafeedResultChartData(jobId: string, start: number, end: number) {
    const body = JSON.stringify({
      jobId,
      start,
      end,
    });
    return httpService.http<GetDatafeedResultsChartDataResult>({
      path: `${basePath()}/results/datafeed_results_chart`,
      method: 'POST',
      body,
    });
  },

  getAnomalyCharts$(
    jobIds: string[],
    influencers: EntityField[],
    threshold: number,
    earliestMs: number,
    latestMs: number,
    timeBounds: { min?: number; max?: number },
    maxResults: number,
    numberOfPoints: number,
    influencersFilterQuery?: InfluencersFilterQuery
  ) {
    const body = JSON.stringify({
      jobIds,
      influencers,
      threshold,
      earliestMs,
      latestMs,
      maxResults,
      influencersFilterQuery,
      numberOfPoints,
      timeBounds,
    });
    return httpService.http$<ExplorerChartsData>({
      path: `${basePath()}/results/anomaly_charts`,
      method: 'POST',
      body,
    });
  },
});
