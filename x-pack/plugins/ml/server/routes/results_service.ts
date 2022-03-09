/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
   * @api {post} /api/ml/results/anomalies_table_data Get anomalies records for table display
   * @apiName GetAnomaliesTableData
   * @apiDescription Retrieves anomaly records for an anomaly detection job and formats them for anomalies table display.
   *
   * @apiSchema (body) anomaliesTableDataSchema
   */
  router.post(
    {
      path: '/api/ml/results/anomalies_table_data',
      validate: {
        body: anomaliesTableDataSchema,
      },
      options: {
        tags: ['access:ml:canGetJobs'],
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
   * @api {post} /api/ml/results/category_definition Get category definition
   * @apiName GetCategoryDefinition
   * @apiDescription Returns the definition of the category with the specified ID and job ID
   *
   * @apiSchema (body) categoryDefinitionSchema
   */
  router.post(
    {
      path: '/api/ml/results/category_definition',
      validate: {
        body: categoryDefinitionSchema,
      },
      options: {
        tags: ['access:ml:canGetJobs'],
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
   * @api {post} /api/ml/results/max_anomaly_score Get the maximum anomaly_score
   * @apiName GetMaxAnomalyScore
   * @apiDescription Returns the maximum anomaly score of the bucket results for the request job ID(s) and time range
   *
   * @apiSchema (body) maxAnomalyScoreSchema
   */
  router.post(
    {
      path: '/api/ml/results/max_anomaly_score',
      validate: {
        body: maxAnomalyScoreSchema,
      },
      options: {
        tags: ['access:ml:canGetJobs'],
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
   * @api {post} /api/ml/results/category_examples Get category examples
   * @apiName GetCategoryExamples
   * @apiDescription Returns examples for the categories with the specified IDs from the job with the supplied ID
   *
   * @apiSchema (body) categoryExamplesSchema
   */
  router.post(
    {
      path: '/api/ml/results/category_examples',
      validate: {
        body: categoryExamplesSchema,
      },
      options: {
        tags: ['access:ml:canGetJobs'],
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
   * @api {post} /api/ml/results/partition_fields_values Returns partition fields values
   * @apiName GetPartitionFieldsValues
   * @apiDescription Returns the partition fields with values that match the provided criteria for the specified job ID.
   *
   * @apiSchema (body) partitionFieldValuesSchema
   */
  router.post(
    {
      path: '/api/ml/results/partition_fields_values',
      validate: {
        body: partitionFieldValuesSchema,
      },
      options: {
        tags: ['access:ml:canGetJobs'],
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
   * @api {post} /api/ml/results/anomaly_search Run a search on the anomaly results index
   * @apiName AnomalySearch
   * @apiDescription Runs the supplied query against the anomaly results index for the specified job IDs.
   * @apiSchema (body) anomalySearchSchema
   */
  router.post(
    {
      path: '/api/ml/results/anomaly_search',
      validate: {
        body: anomalySearchSchema,
      },
      options: {
        tags: ['access:ml:canGetJobs'],
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
   * @api {get} /api/ml/results/:jobId/categorizer_stats Return categorizer statistics
   * @apiName GetCategorizerStats
   * @apiDescription Returns the categorizer stats for the specified job ID
   * @apiSchema (params) jobIdSchema
   * @apiSchema (query) getCategorizerStatsSchema
   */
  router.get(
    {
      path: '/api/ml/results/{jobId}/categorizer_stats',
      validate: {
        params: jobIdSchema,
        query: getCategorizerStatsSchema,
      },
      options: {
        tags: ['access:ml:canGetJobs'],
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
   * @api {post} /api/ml/results/category_stopped_partitions Get partitions that have stopped being categorized
   * @apiName GetCategoryStoppedPartitions
   * @apiDescription Returns information on the partitions that have stopped being categorized due to the categorization status changing from ok to warn. Can return either the list of stopped partitions for each job, or just the list of job IDs.
   * @apiSchema (body) getCategorizerStoppedPartitionsSchema
   */
  router.post(
    {
      path: '/api/ml/results/category_stopped_partitions',
      validate: {
        body: getCategorizerStoppedPartitionsSchema,
      },
      options: {
        tags: ['access:ml:canGetJobs'],
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
   * @api {post} /api/ml/results/datafeed_results_chart Get datafeed results chart data
   * @apiName GetDatafeedResultsChartData
   * @apiDescription Returns datafeed results chart data
   *
   * @apiSchema (body) getDatafeedResultsChartDataSchema
   */
  router.post(
    {
      path: '/api/ml/results/datafeed_results_chart',
      validate: {
        body: getDatafeedResultsChartDataSchema,
      },
      options: {
        tags: ['access:ml:canGetJobs'],
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
}
