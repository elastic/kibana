/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Service for obtaining data for the ML Results dashboards.

import { useMemo } from 'react';
import type { ESSearchRequest, ESSearchResponse } from '@kbn/es-types';
import type { MlEntityField } from '@kbn/ml-anomaly-utils';

import {
  type MlAnomalyRecordDoc,
  MLAnomalyDoc,
  ML_JOB_ID,
  ML_PARTITION_FIELD_VALUE,
} from '@kbn/ml-anomaly-utils';
import type {
  GetStoppedPartitionResult,
  GetDatafeedResultsChartDataResult,
} from '../../../../common/types/results';
import type { JobId } from '../../../../common/types/anomaly_detection_jobs';
import type { PartitionFieldsConfig } from '../../../../common/types/storage';
import type { InfluencersFilterQuery } from '../../../../common/types/es_client';
import type { ExplorerChartsData } from '../../../../common/types/results';

import { useMlKibana } from '../../contexts/kibana';
import type { HttpService } from '../http_service';
import type { CriteriaField } from '../results_service';
import type { PartitionFieldsDefinition } from '../results_service/result_service_rx';

import { basePath } from '.';

export interface CategoryDefinition {
  categoryId: number;
  terms: string;
  regex: string;
  examples: string[];
}

export const resultsApiProvider = (httpService: HttpService) => ({
  getAnomaliesTableData(
    jobIds: string[],
    criteriaFields: string[],
    influencers: MlEntityField[],
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
    return httpService.http<CategoryDefinition>({
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
    fieldToBucket?: typeof ML_JOB_ID | typeof ML_PARTITION_FIELD_VALUE
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
    influencers: MlEntityField[],
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

  getAnomalyRecords$(
    jobIds: string[],
    criteriaFields: CriteriaField[],
    severity: number,
    earliestMs: number | null,
    latestMs: number | null,
    interval: string,
    functionDescription?: string
  ) {
    const body = JSON.stringify({
      jobIds,
      criteriaFields,
      threshold: severity,
      earliestMs,
      latestMs,
      interval,
      functionDescription,
    });
    return httpService.http$<{ success: boolean; records: MlAnomalyRecordDoc[] }>({
      path: `${basePath()}/results/anomaly_records`,
      method: 'POST',
      body,
    });
  },
});

export type ResultsApiService = ReturnType<typeof resultsApiProvider>;

/**
 * Hooks for accessing {@link ResultsApiService} in React components.
 */
export function useResultsApiService(): ResultsApiService {
  const {
    services: {
      mlServices: { httpService },
    },
  } = useMlKibana();
  return useMemo(() => resultsApiProvider(httpService), [httpService]);
}
