/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IScopedClusterClient } from 'kibana/server';
import { schema } from '@kbn/config-schema';
import { wrapError } from '../client/error_wrapper';
import { RouteInitialization } from '../types';
import {
  anomaliesTableDataSchema,
  categoryDefinitionSchema,
  categoryExamplesSchema,
  maxAnomalyScoreSchema,
  partitionFieldValuesSchema,
} from './schemas/results_service_schema';
import { resultsServiceProvider } from '../models/results_service';
import { ML_RESULTS_INDEX_PATTERN } from '../../common/constants/index_patterns';
import { jobIdSchema } from './schemas/anomaly_detectors_schema';
import {
  getCategorizerStatsSchema,
  getCategorizerStoppedPartitionsSchema,
} from './schemas/results_service_schema';

function getAnomaliesTableData(client: IScopedClusterClient, payload: any) {
  const rs = resultsServiceProvider(client);
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
    influencersFilterQuery
  );
}

function getCategoryDefinition(client: IScopedClusterClient, payload: any) {
  const rs = resultsServiceProvider(client);
  return rs.getCategoryDefinition(payload.jobId, payload.categoryId);
}

function getCategoryExamples(client: IScopedClusterClient, payload: any) {
  const rs = resultsServiceProvider(client);
  const { jobId, categoryIds, maxExamples } = payload;
  return rs.getCategoryExamples(jobId, categoryIds, maxExamples);
}

function getMaxAnomalyScore(client: IScopedClusterClient, payload: any) {
  const rs = resultsServiceProvider(client);
  const { jobIds, earliestMs, latestMs } = payload;
  return rs.getMaxAnomalyScore(jobIds, earliestMs, latestMs);
}

function getPartitionFieldsValues(client: IScopedClusterClient, payload: any) {
  const rs = resultsServiceProvider(client);
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

function getCategorizerStats(client: IScopedClusterClient, params: any, query: any) {
  const { jobId } = params;
  const { partitionByValue } = query;
  const rs = resultsServiceProvider(client);
  return rs.getCategorizerStats(jobId, partitionByValue);
}

function getCategoryStoppedPartitions(client: IScopedClusterClient, payload: any) {
  const { jobIds, fieldToBucket } = payload;
  const rs = resultsServiceProvider(client);
  return rs.getCategoryStoppedPartitions(jobIds, fieldToBucket);
}

/**
 * Routes for results service
 */
export function resultsServiceRoutes({ router, mlLicense }: RouteInitialization) {
  /**
   * @apiGroup ResultsService
   *
   * @api {post} /api/ml/results/anomalies_table_data Prepare anomalies records for table display
   * @apiName GetAnomaliesTableData
   * @apiDescription Retrieves anomaly records for an anomaly detection job and formats them for anomalies table display
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
    mlLicense.fullLicenseAPIGuard(async ({ client, request, response }) => {
      try {
        const resp = await getAnomaliesTableData(client, request.body);

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
   * @api {post} /api/ml/results/category_definition Returns category definition
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
    mlLicense.fullLicenseAPIGuard(async ({ client, request, response }) => {
      try {
        const resp = await getCategoryDefinition(client, request.body);

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
   * @api {post} /api/ml/results/max_anomaly_score Returns the maximum anomaly_score
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
    mlLicense.fullLicenseAPIGuard(async ({ client, request, response }) => {
      try {
        const resp = await getMaxAnomalyScore(client, request.body);

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
   * @api {post} /api/ml/results/category_examples Returns category examples
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
    mlLicense.fullLicenseAPIGuard(async ({ client, request, response }) => {
      try {
        const resp = await getCategoryExamples(client, request.body);

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
    mlLicense.fullLicenseAPIGuard(async ({ client, request, response }) => {
      try {
        const resp = await getPartitionFieldsValues(client, request.body);

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
   * @api {post} /api/ml/results/anomaly_search Performs a search on the anomaly results index
   * @apiName AnomalySearch
   */
  router.post(
    {
      path: '/api/ml/results/anomaly_search',
      validate: {
        body: schema.maybe(schema.any()),
      },
      options: {
        tags: ['access:ml:canGetJobs'],
      },
    },
    mlLicense.fullLicenseAPIGuard(async ({ client, request, response }) => {
      const { body } = await client.asInternalUser.search({
        ...request.body,
        index: ML_RESULTS_INDEX_PATTERN,
      });
      try {
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
   * @api {get} /api/ml/results/:jobId/categorizer_stats
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
    mlLicense.fullLicenseAPIGuard(async ({ client, request, response }) => {
      try {
        const resp = await getCategorizerStats(client, request.params, request.query);
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
   * @api {get} /api/ml/results/category_stopped_partitions
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
    mlLicense.fullLicenseAPIGuard(async ({ client, request, response }) => {
      try {
        const resp = await getCategoryStoppedPartitions(client, request.body);
        return response.ok({
          body: resp,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );
}
