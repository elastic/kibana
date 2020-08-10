/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RequestHandlerContext } from 'kibana/server';
import { schema } from '@kbn/config-schema';
import { SearchResponse } from 'elasticsearch';
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
import { getCategorizerStatsSchema } from './schemas/results_service_schema';

import { AnomalyCategorizerStatsDoc } from '../../common/types/anomalies';

function getAnomaliesTableData(context: RequestHandlerContext, payload: any) {
  const rs = resultsServiceProvider(context.ml!.mlClient);
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

function getCategoryDefinition(context: RequestHandlerContext, payload: any) {
  const rs = resultsServiceProvider(context.ml!.mlClient);
  return rs.getCategoryDefinition(payload.jobId, payload.categoryId);
}

function getCategoryExamples(context: RequestHandlerContext, payload: any) {
  const rs = resultsServiceProvider(context.ml!.mlClient);
  const { jobId, categoryIds, maxExamples } = payload;
  return rs.getCategoryExamples(jobId, categoryIds, maxExamples);
}

function getMaxAnomalyScore(context: RequestHandlerContext, payload: any) {
  const rs = resultsServiceProvider(context.ml!.mlClient);
  const { jobIds, earliestMs, latestMs } = payload;
  return rs.getMaxAnomalyScore(jobIds, earliestMs, latestMs);
}

function getPartitionFieldsValues(context: RequestHandlerContext, payload: any) {
  const rs = resultsServiceProvider(context.ml!.mlClient);
  const { jobId, searchTerm, criteriaFields, earliestMs, latestMs } = payload;
  return rs.getPartitionFieldsValues(jobId, searchTerm, criteriaFields, earliestMs, latestMs);
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
    mlLicense.fullLicenseAPIGuard(async (context, request, response) => {
      try {
        const resp = await getAnomaliesTableData(context, request.body);

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
    mlLicense.fullLicenseAPIGuard(async (context, request, response) => {
      try {
        const resp = await getCategoryDefinition(context, request.body);

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
    mlLicense.fullLicenseAPIGuard(async (context, request, response) => {
      try {
        const resp = await getMaxAnomalyScore(context, request.body);

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
    mlLicense.fullLicenseAPIGuard(async (context, request, response) => {
      try {
        const resp = await getCategoryExamples(context, request.body);

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
    mlLicense.fullLicenseAPIGuard(async (context, request, response) => {
      try {
        const resp = await getPartitionFieldsValues(context, request.body);

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
    mlLicense.fullLicenseAPIGuard(async (context, request, response) => {
      const body = {
        ...request.body,
        index: ML_RESULTS_INDEX_PATTERN,
      };
      try {
        return response.ok({
          body: await context.ml!.mlClient.callAsInternalUser('search', body),
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
   * @apiDescription Returns the categorizer snapshots for the specified job ID
   * @apiSchema (params) getCatergorizerStatsSchema
   */
  router.get(
    {
      path: '/api/ml/results/{jobId}/categorizer_stats',
      validate: {
        params: jobIdSchema,
        query: getCategorizerStatsSchema,
      },
      options: {
        tags: ['access:ml:canCreateJob'],
      },
    },
    mlLicense.fullLicenseAPIGuard(async (context, request, response) => {
      try {
        const { jobId } = request.params;
        const { partitionByValue } = request.query;
        const mustMatchClauses: Array<Record<'match', Record<string, string>>> = [
          {
            match: {
              result_type: 'categorizer_stats',
            },
          },
        ];

        if (typeof partitionByValue === 'string') {
          mustMatchClauses.push({
            match: {
              partition_by_value: partitionByValue,
            },
          });
        }
        const results: SearchResponse<AnomalyCategorizerStatsDoc> = await context.ml!.mlClient.callAsCurrentUser(
          'search',
          {
            index: ML_RESULTS_INDEX_PATTERN,
            body: {
              query: {
                bool: {
                  must: mustMatchClauses,
                  filter: [
                    {
                      term: {
                        job_id: jobId,
                      },
                    },
                  ],
                },
              },
            },
          }
        );
        return response.ok({
          body: results ? results.hits.hits.map((r) => r._source) : [],
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup ResultsService
   *
   * @api {get} /api/ml/results/:jobId/categorizer_stats
   * @apiName GetStoppedPartitions
   * @apiDescription Returns list of partitions we stopped categorizing whens status changed to warn
   * @apiSchema (params) jobIdSchema
   */
  router.get(
    {
      path: '/api/ml/results/{jobId}/stopped_partitions',
      validate: {
        params: jobIdSchema,
      },
      options: {
        tags: ['access:ml:canCreateJob'],
      },
    },
    mlLicense.fullLicenseAPIGuard(async (context, request, response) => {
      try {
        const { jobId } = request.params;
        let finalResult: Array<{ key: string; doc_count: number }> = [];
        // first determine from job config if stop_on_warn is true
        // if false return []
        const jobConfigResponse = await context.ml!.mlClient.callAsInternalUser('ml.jobs', {
          jobId,
        });

        if (!jobConfigResponse || jobConfigResponse.jobs.length !== 1) {
          return response.customError({
            statusCode: 404,
            body: `Unable to find anomaly detector job with ID ${jobId}`,
          });
        }

        const jobConfig = jobConfigResponse.jobs[0];
        if (jobConfig.analysis_config?.per_partition_categorization?.stop_on_warn === true) {
          // search for categorizer_stats documents for the current job where the categorization_status is warn
          // Return all the partition_field_value values from the documents found
          const mustMatchClauses: Array<Record<'match', Record<string, string>>> = [
            {
              match: {
                result_type: 'categorizer_stats',
              },
            },
            {
              match: {
                categorization_status: 'warn',
              },
            },
          ];
          const results: SearchResponse<any> = await context.ml!.mlClient.callAsCurrentUser(
            'search',
            {
              index: ML_RESULTS_INDEX_PATTERN,
              size: 0,
              body: {
                query: {
                  bool: {
                    must: mustMatchClauses,
                    filter: [
                      {
                        term: {
                          job_id: jobId,
                        },
                      },
                    ],
                  },
                },
                aggs: {
                  unique_partition_field_values: {
                    terms: {
                      field: 'partition_field_value',
                    },
                  },
                },
              },
            }
          );
          if (Array.isArray(results.aggregations?.unique_partition_field_values?.buckets)) {
            finalResult = results.aggregations?.unique_partition_field_values?.buckets.map(
              (b: { key: string; doc_count: number }) => b.key
            );
          }
        }

        return response.ok({
          body: finalResult,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );
}
