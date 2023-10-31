/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ML_INTERNAL_BASE_PATH } from '../../common/constants/app';
import { wrapError } from '../client/error_wrapper';
import { RouteInitialization } from '../types';
import {
  anomaliesTableDataSchema,
  categoryDefinitionSchema,
  categoryExamplesSchema,
  getDatafeedResultsChartDataSchema,
  maxAnomalyScoreSchema,
  partitionFieldValuesSchema,
  anomalySearchSchema,
  getAnomalyChartsSchema,
  getAnomalyRecordsSchema,
} from './schemas/results_service_schema';
import { resultsServiceProvider } from '../models/results_service';
import { jobIdSchema } from './schemas/anomaly_detectors_schema';
import {
  getCategorizerStatsSchema,
  getCategorizerStoppedPartitionsSchema,
} from './schemas/results_service_schema';
import type { MlClient } from '../lib/ml_client';

function getAnomaliesTableData(mlClient: MlClient, payload: any) {
  const rs = resultsServiceProvider(mlClient);
  const {
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
  } = payload;
  return rs.getAnomaliesTableData(
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
    functionDescription
  );
}

function getCategoryDefinition(mlClient: MlClient, payload: any) {
  const rs = resultsServiceProvider(mlClient);
  return rs.getCategoryDefinition(payload.jobId, payload.categoryId);
}

function getCategoryExamples(mlClient: MlClient, payload: any) {
  const rs = resultsServiceProvider(mlClient);
  const { jobId, categoryIds, maxExamples } = payload;
  return rs.getCategoryExamples(jobId, categoryIds, maxExamples);
}

function getMaxAnomalyScore(mlClient: MlClient, payload: any) {
  const rs = resultsServiceProvider(mlClient);
  const { jobIds, earliestMs, latestMs } = payload;
  return rs.getMaxAnomalyScore(jobIds, earliestMs, latestMs);
}

function getPartitionFieldsValues(mlClient: MlClient, payload: any) {
  const rs = resultsServiceProvider(mlClient);
  const { jobId, searchTerm, criteriaFields, earliestMs, latestMs, fieldsConfig } = payload;
  return rs.getPartitionFieldsValues(
    jobId,
    searchTerm,
    criteriaFields,
    earliestMs,
    latestMs,
    fieldsConfig
  );
}

function getCategorizerStats(mlClient: MlClient, params: any, query: any) {
  const { jobId } = params;
  const { partitionByValue } = query;
  const rs = resultsServiceProvider(mlClient);
  return rs.getCategorizerStats(jobId, partitionByValue);
}

function getCategoryStoppedPartitions(mlClient: MlClient, payload: any) {
  const { jobIds, fieldToBucket } = payload;
  const rs = resultsServiceProvider(mlClient);
  return rs.getCategoryStoppedPartitions(jobIds, fieldToBucket);
}

/**
 * Routes for results service
 */
export function resultsServiceRoutes({ router, routeGuard }: RouteInitialization) {
  /**
   * @apiGroup ResultsService
   *
   * @api {post} /internal/ml/results/anomalies_table_data Get anomalies records for table display
   * @apiName GetAnomaliesTableData
   * @apiDescription Retrieves anomaly records for an anomaly detection job and formats them for anomalies table display.
   *
   * @apiSchema (body) anomaliesTableDataSchema
   */
  router.versioned
    .post({
      path: `${ML_INTERNAL_BASE_PATH}/results/anomalies_table_data`,
      access: 'internal',
      options: {
        tags: ['access:ml:canGetJobs'],
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: anomaliesTableDataSchema,
          },
        },
      },
      routeGuard.fullLicenseAPIGuard(async ({ mlClient, request, response }) => {
        try {
          const resp = await getAnomaliesTableData(mlClient, request.body);

          return response.ok({
            body: resp,
          });
        } catch (e) {
          return response.customError(wrapError(e));
        }
      })
    );

  /**
   * @apiGroup ResultsService
   *
   * @api {post} /internal/ml/results/category_definition Get category definition
   * @apiName GetCategoryDefinition
   * @apiDescription Returns the definition of the category with the specified ID and job ID
   *
   * @apiSchema (body) categoryDefinitionSchema
   */
  router.versioned
    .post({
      path: `${ML_INTERNAL_BASE_PATH}/results/category_definition`,
      access: 'internal',
      options: {
        tags: ['access:ml:canGetJobs'],
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: categoryDefinitionSchema,
          },
        },
      },
      routeGuard.fullLicenseAPIGuard(async ({ mlClient, request, response }) => {
        try {
          const resp = await getCategoryDefinition(mlClient, request.body);

          return response.ok({
            body: resp,
          });
        } catch (e) {
          return response.customError(wrapError(e));
        }
      })
    );

  /**
   * @apiGroup ResultsService
   *
   * @api {post} /internal/ml/results/max_anomaly_score Get the maximum anomaly_score
   * @apiName GetMaxAnomalyScore
   * @apiDescription Returns the maximum anomaly score of the bucket results for the request job ID(s) and time range
   *
   * @apiSchema (body) maxAnomalyScoreSchema
   */
  router.versioned
    .post({
      path: `${ML_INTERNAL_BASE_PATH}/results/max_anomaly_score`,
      access: 'internal',
      options: {
        tags: ['access:ml:canGetJobs'],
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: maxAnomalyScoreSchema,
          },
        },
      },
      routeGuard.fullLicenseAPIGuard(async ({ mlClient, request, response }) => {
        try {
          const resp = await getMaxAnomalyScore(mlClient, request.body);

          return response.ok({
            body: resp,
          });
        } catch (e) {
          return response.customError(wrapError(e));
        }
      })
    );

  /**
   * @apiGroup ResultsService
   *
   * @api {post} /internal/ml/results/category_examples Get category examples
   * @apiName GetCategoryExamples
   * @apiDescription Returns examples for the categories with the specified IDs from the job with the supplied ID
   *
   * @apiSchema (body) categoryExamplesSchema
   */
  router.versioned
    .post({
      path: `${ML_INTERNAL_BASE_PATH}/results/category_examples`,
      access: 'internal',
      options: {
        tags: ['access:ml:canGetJobs'],
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: categoryExamplesSchema,
          },
        },
      },
      routeGuard.fullLicenseAPIGuard(async ({ mlClient, request, response }) => {
        try {
          const resp = await getCategoryExamples(mlClient, request.body);

          return response.ok({
            body: resp,
          });
        } catch (e) {
          return response.customError(wrapError(e));
        }
      })
    );

  /**
   * @apiGroup ResultsService
   *
   * @api {post} /internal/ml/results/partition_fields_values Returns partition fields values
   * @apiName GetPartitionFieldsValues
   * @apiDescription Returns the partition fields with values that match the provided criteria for the specified job ID.
   *
   * @apiSchema (body) partitionFieldValuesSchema
   */
  router.versioned
    .post({
      path: `${ML_INTERNAL_BASE_PATH}/results/partition_fields_values`,
      access: 'internal',
      options: {
        tags: ['access:ml:canGetJobs'],
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: partitionFieldValuesSchema,
          },
        },
      },
      routeGuard.fullLicenseAPIGuard(async ({ mlClient, request, response }) => {
        try {
          const resp = await getPartitionFieldsValues(mlClient, request.body);

          return response.ok({
            body: resp,
          });
        } catch (e) {
          return response.customError(wrapError(e));
        }
      })
    );

  /**
   * @apiGroup ResultsService
   *
   * @api {post} /internal/ml/results/anomaly_search Run a search on the anomaly results index
   * @apiName AnomalySearch
   * @apiDescription Runs the supplied query against the anomaly results index for the specified job IDs.
   * @apiSchema (body) anomalySearchSchema
   */
  router.versioned
    .post({
      path: `${ML_INTERNAL_BASE_PATH}/results/anomaly_search`,
      access: 'internal',
      options: {
        tags: ['access:ml:canGetJobs'],
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: anomalySearchSchema,
          },
        },
      },
      routeGuard.fullLicenseAPIGuard(async ({ mlClient, request, response }) => {
        try {
          const { jobIds, query } = request.body;
          const body = await mlClient.anomalySearch(query, jobIds);
          return response.ok({
            body,
          });
        } catch (error) {
          return response.customError(wrapError(error));
        }
      })
    );

  /**
   * @apiGroup ResultsService
   *
   * @api {get} /internal/ml/results/:jobId/categorizer_stats Return categorizer statistics
   * @apiName GetCategorizerStats
   * @apiDescription Returns the categorizer stats for the specified job ID
   * @apiSchema (params) jobIdSchema
   * @apiSchema (query) getCategorizerStatsSchema
   */
  router.versioned
    .get({
      path: `${ML_INTERNAL_BASE_PATH}/results/{jobId}/categorizer_stats`,
      access: 'internal',
      options: {
        tags: ['access:ml:canGetJobs'],
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: jobIdSchema,
            query: getCategorizerStatsSchema,
          },
        },
      },
      routeGuard.fullLicenseAPIGuard(async ({ mlClient, request, response }) => {
        try {
          const resp = await getCategorizerStats(mlClient, request.params, request.query);
          return response.ok({
            body: resp,
          });
        } catch (e) {
          return response.customError(wrapError(e));
        }
      })
    );

  /**
   * @apiGroup ResultsService
   *
   * @api {post} /internal/ml/results/category_stopped_partitions Get partitions that have stopped being categorized
   * @apiName GetCategoryStoppedPartitions
   * @apiDescription Returns information on the partitions that have stopped being categorized due to the categorization status changing from ok to warn. Can return either the list of stopped partitions for each job, or just the list of job IDs.
   * @apiSchema (body) getCategorizerStoppedPartitionsSchema
   */
  router.versioned
    .post({
      path: `${ML_INTERNAL_BASE_PATH}/results/category_stopped_partitions`,
      access: 'internal',
      options: {
        tags: ['access:ml:canGetJobs'],
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: getCategorizerStoppedPartitionsSchema,
          },
        },
      },
      routeGuard.fullLicenseAPIGuard(async ({ mlClient, request, response }) => {
        try {
          const resp = await getCategoryStoppedPartitions(mlClient, request.body);
          return response.ok({
            body: resp,
          });
        } catch (e) {
          return response.customError(wrapError(e));
        }
      })
    );

  /**
   * @apiGroup ResultsService
   *
   * @api {post} /internal/ml/results/datafeed_results_chart Get datafeed results chart data
   * @apiName GetDatafeedResultsChartData
   * @apiDescription Returns datafeed results chart data
   *
   * @apiSchema (body) getDatafeedResultsChartDataSchema
   */
  router.versioned
    .post({
      path: `${ML_INTERNAL_BASE_PATH}/results/datafeed_results_chart`,
      access: 'internal',
      options: {
        tags: ['access:ml:canGetJobs'],
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: getDatafeedResultsChartDataSchema,
          },
        },
      },
      routeGuard.fullLicenseAPIGuard(async ({ client, mlClient, request, response }) => {
        try {
          const { getDatafeedResultsChartData } = resultsServiceProvider(mlClient, client);
          const resp = await getDatafeedResultsChartData(request.body);

          return response.ok({
            body: resp,
          });
        } catch (e) {
          return response.customError(wrapError(e));
        }
      })
    );

  /**
   * @apiGroup ResultsService
   *
   * @api {post} /internal/ml/results/anomaly_charts Get data for anomaly charts
   * @apiName GetAnomalyChartsData
   * @apiDescription Returns anomaly charts data
   *
   * @apiSchema (body) getAnomalyChartsSchema
   */
  router.versioned
    .post({
      path: `${ML_INTERNAL_BASE_PATH}/results/anomaly_charts`,
      access: 'internal',
      options: {
        tags: ['access:ml:canGetJobs'],
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: getAnomalyChartsSchema,
          },
        },
      },
      routeGuard.fullLicenseAPIGuard(async ({ client, mlClient, request, response }) => {
        try {
          const { getAnomalyChartsData } = resultsServiceProvider(mlClient, client);
          const resp = await getAnomalyChartsData(request.body);

          return response.ok({
            body: resp,
          });
        } catch (e) {
          return response.customError(wrapError(e));
        }
      })
    );

  /**
   * @apiGroup ResultsService
   *
   * @api {post} /internal/ml/results/anomaly_records Get anomaly records for criteria
   * @apiName GetAnomalyRecords
   * @apiDescription Returns anomaly records
   *
   * @apiSchema (body) getAnomalyRecordsSchema
   */
  router.versioned
    .post({
      path: `${ML_INTERNAL_BASE_PATH}/results/anomaly_records`,
      access: 'internal',
      options: {
        tags: ['access:ml:canGetJobs'],
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: getAnomalyRecordsSchema,
          },
        },
      },
      routeGuard.fullLicenseAPIGuard(async ({ client, mlClient, request, response }) => {
        try {
          const { getRecordsForCriteria } = resultsServiceProvider(mlClient, client);

          const { jobIds, criteriaFields, earliestMs, latestMs, threshold, interval } =
            request.body;

          const resp = await getRecordsForCriteria(
            jobIds,
            criteriaFields,
            threshold,
            earliestMs,
            latestMs,
            interval
          );

          return response.ok({
            body: resp,
          });
        } catch (e) {
          return response.customError(wrapError(e));
        }
      })
    );
}
