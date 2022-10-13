/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient } from '@kbn/core/server';
import type { DataViewsService } from '@kbn/data-views-plugin/common';
import { wrapError } from '../client/error_wrapper';
import { analyticsAuditMessagesProvider } from '../models/data_frame_analytics/analytics_audit_messages';
import type { RouteInitialization } from '../types';
import { JOB_MAP_NODE_TYPES } from '../../common/constants/data_frame_analytics';
import type { Field, Aggregation } from '../../common/types/fields';
import {
  dataAnalyticsJobConfigSchema,
  dataAnalyticsJobUpdateSchema,
  dataAnalyticsEvaluateSchema,
  dataAnalyticsExplainSchema,
  analyticsIdSchema,
  analyticsMapQuerySchema,
  stopsDataFrameAnalyticsJobQuerySchema,
  deleteDataFrameAnalyticsJobSchema,
  jobsExistSchema,
  analyticsQuerySchema,
  analyticsNewJobCapsParamsSchema,
  analyticsNewJobCapsQuerySchema,
} from './schemas/data_analytics_schema';
import type {
  GetAnalyticsMapArgs,
  ExtendAnalyticsMapArgs,
} from '../models/data_frame_analytics/types';
import { DataViewHandler } from '../models/data_frame_analytics/index_patterns';
import { AnalyticsManager } from '../models/data_frame_analytics/analytics_manager';
import { validateAnalyticsJob } from '../models/data_frame_analytics/validation';
import { fieldServiceProvider } from '../models/job_service/new_job_caps/field_service';
import type { DeleteDataFrameAnalyticsWithIndexStatus } from '../../common/types/data_frame_analytics';
import { getAuthorizationHeader } from '../lib/request_authorization';
import type { MlClient } from '../lib/ml_client';

function getDataViewId(dataViewsService: DataViewsService, patternName: string) {
  const iph = new DataViewHandler(dataViewsService);
  return iph.getDataViewId(patternName);
}

function deleteDestDataViewById(dataViewsService: DataViewsService, dataViewId: string) {
  const iph = new DataViewHandler(dataViewsService);
  return iph.deleteDataViewById(dataViewId);
}

function getAnalyticsMap(
  mlClient: MlClient,
  client: IScopedClusterClient,
  idOptions: GetAnalyticsMapArgs
) {
  const analytics = new AnalyticsManager(mlClient, client);
  return analytics.getAnalyticsMap(idOptions);
}

function getExtendedMap(
  mlClient: MlClient,
  client: IScopedClusterClient,
  idOptions: ExtendAnalyticsMapArgs
) {
  const analytics = new AnalyticsManager(mlClient, client);
  return analytics.extendAnalyticsMapForAnalyticsJob(idOptions);
}

// replace the recursive field and agg references with a
// map of ids to allow it to be stringified for transportation
// over the network.
function convertForStringify(aggs: Aggregation[], fields: Field[]): void {
  fields.forEach((f) => {
    f.aggIds = f.aggs ? f.aggs.map((a) => a.id) : [];
    delete f.aggs;
  });
  aggs.forEach((a) => {
    if (a.fields !== undefined) {
      // if the aggregation supports fields, i.e. it's fields list isn't undefined,
      // create a list of field ids
      a.fieldIds = a.fields.map((f) => f.id);
    }
    delete a.fields;
  });
}

/**
 * Routes for the data frame analytics
 */
export function dataFrameAnalyticsRoutes({ router, mlLicense, routeGuard }: RouteInitialization) {
  async function userCanDeleteIndex(
    client: IScopedClusterClient,
    destinationIndex: string
  ): Promise<boolean> {
    if (!mlLicense.isSecurityEnabled()) {
      return true;
    }

    const body = await client.asCurrentUser.security.hasPrivileges({
      body: {
        index: [
          {
            names: [destinationIndex], // uses wildcard
            privileges: ['delete_index'],
          },
        ],
      },
    });

    return body?.has_all_requested === true;
  }

  /**
   * @apiGroup DataFrameAnalytics
   *
   * @api {get} /api/ml/data_frame/analytics Get analytics data
   * @apiName GetDataFrameAnalytics
   * @apiDescription Returns the list of data frame analytics jobs.
   *
   * @apiSuccess {Number} count
   * @apiSuccess {Object[]} data_frame_analytics
   */
  router.get(
    {
      path: '/api/ml/data_frame/analytics',
      validate: {
        query: analyticsQuerySchema,
      },
      options: {
        tags: ['access:ml:canGetDataFrameAnalytics'],
      },
    },
    routeGuard.fullLicenseAPIGuard(async ({ mlClient, request, response }) => {
      try {
        const { size } = request.query;
        const body = await mlClient.getDataFrameAnalytics({
          size: size ?? 1000,
        });
        return response.ok({
          body,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup DataFrameAnalytics
   *
   * @api {get} /api/ml/data_frame/analytics/:analyticsId Get analytics data by id
   * @apiName GetDataFrameAnalyticsById
   * @apiDescription Returns the data frame analytics job.
   *
   * @apiSchema (params) analyticsIdSchema
   */
  router.get(
    {
      path: '/api/ml/data_frame/analytics/{analyticsId}',
      validate: {
        params: analyticsIdSchema,
        query: analyticsQuerySchema,
      },
      options: {
        tags: ['access:ml:canGetDataFrameAnalytics'],
      },
    },
    routeGuard.fullLicenseAPIGuard(async ({ mlClient, request, response }) => {
      try {
        const { analyticsId } = request.params;
        const { excludeGenerated } = request.query;

        const body = await mlClient.getDataFrameAnalytics({
          id: analyticsId,
          ...(excludeGenerated ? { exclude_generated: true } : {}),
        });
        return response.ok({
          body,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup DataFrameAnalytics
   *
   * @api {get} /api/ml/data_frame/analytics/_stats Get analytics stats
   * @apiName GetDataFrameAnalyticsStats
   * @apiDescription Returns data frame analytics jobs statistics.
   */
  router.get(
    {
      path: '/api/ml/data_frame/analytics/_stats',
      validate: false,
      options: {
        tags: ['access:ml:canGetDataFrameAnalytics'],
      },
    },
    routeGuard.fullLicenseAPIGuard(async ({ mlClient, response }) => {
      try {
        const body = await mlClient.getDataFrameAnalyticsStats({ size: 1000 });
        return response.ok({
          body,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup DataFrameAnalytics
   *
   * @api {get} /api/ml/data_frame/analytics/:analyticsId/_stats Get stats for requested analytics job
   * @apiName GetDataFrameAnalyticsStatsById
   * @apiDescription Returns data frame analytics job statistics.
   *
   * @apiSchema (params) analyticsIdSchema
   */
  router.get(
    {
      path: '/api/ml/data_frame/analytics/{analyticsId}/_stats',
      validate: {
        params: analyticsIdSchema,
      },
      options: {
        tags: ['access:ml:canGetDataFrameAnalytics'],
      },
    },
    routeGuard.fullLicenseAPIGuard(async ({ mlClient, request, response }) => {
      try {
        const { analyticsId } = request.params;
        const body = await mlClient.getDataFrameAnalyticsStats({
          id: analyticsId,
        });
        return response.ok({
          body,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup DataFrameAnalytics
   *
   * @api {put} /api/ml/data_frame/analytics/:analyticsId Instantiate a data frame analytics job
   * @apiName UpdateDataFrameAnalytics
   * @apiDescription This API creates a data frame analytics job that performs an analysis
   *                 on the source index and stores the outcome in a destination index.
   *
   * @apiSchema (params) analyticsIdSchema
   * @apiSchema (body) dataAnalyticsJobConfigSchema
   */
  router.put(
    {
      path: '/api/ml/data_frame/analytics/{analyticsId}',
      validate: {
        params: analyticsIdSchema,
        body: dataAnalyticsJobConfigSchema,
      },
      options: {
        tags: ['access:ml:canCreateDataFrameAnalytics'],
      },
    },
    routeGuard.fullLicenseAPIGuard(async ({ mlClient, request, response }) => {
      try {
        const { analyticsId } = request.params;
        const body = await mlClient.putDataFrameAnalytics(
          {
            id: analyticsId,
            // @ts-expect-error @elastic-elasticsearch Data frame types incomplete
            body: request.body,
          },
          getAuthorizationHeader(request)
        );
        return response.ok({
          body,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup DataFrameAnalytics
   *
   * @api {post} /api/ml/data_frame/_evaluate Evaluate the data frame analytics for an annotated index
   * @apiName EvaluateDataFrameAnalytics
   * @apiDescription Evaluates the data frame analytics for an annotated index.
   *
   * @apiSchema (body) dataAnalyticsEvaluateSchema
   */
  router.post(
    {
      path: '/api/ml/data_frame/_evaluate',
      validate: {
        body: dataAnalyticsEvaluateSchema,
      },
      options: {
        tags: ['access:ml:canGetDataFrameAnalytics'],
      },
    },
    routeGuard.fullLicenseAPIGuard(async ({ mlClient, request, response }) => {
      try {
        const body = await mlClient.evaluateDataFrame(
          {
            // @ts-expect-error @elastic-elasticsearch Data frame types incomplete
            body: request.body,
          },
          getAuthorizationHeader(request)
        );
        return response.ok({
          body,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup DataFrameAnalytics
   *
   * @api {post} /api/ml/data_frame/_explain Explain a data frame analytics config
   * @apiName ExplainDataFrameAnalytics
   * @apiDescription This API provides explanations for a data frame analytics config
   *                 that either exists already or one that has not been created yet.
   *
   * @apiSchema (body) dataAnalyticsExplainSchema
   */
  router.post(
    {
      path: '/api/ml/data_frame/analytics/_explain',
      validate: {
        body: dataAnalyticsExplainSchema,
      },
      options: {
        tags: ['access:ml:canCreateDataFrameAnalytics'],
      },
    },
    routeGuard.fullLicenseAPIGuard(async ({ mlClient, request, response }) => {
      try {
        const body = await mlClient.explainDataFrameAnalytics(
          {
            body: request.body,
          },
          getAuthorizationHeader(request)
        );
        return response.ok({
          body,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup DataFrameAnalytics
   *
   * @api {delete} /api/ml/data_frame/analytics/:analyticsId Delete specified analytics job
   * @apiName DeleteDataFrameAnalytics
   * @apiDescription Deletes specified data frame analytics job.
   *
   * @apiSchema (params) analyticsIdSchema
   */
  router.delete(
    {
      path: '/api/ml/data_frame/analytics/{analyticsId}',
      validate: {
        params: analyticsIdSchema,
        query: deleteDataFrameAnalyticsJobSchema,
      },
      options: {
        tags: ['access:ml:canDeleteDataFrameAnalytics'],
      },
    },
    routeGuard.fullLicenseAPIGuard(
      async ({ mlClient, client, request, response, getDataViewsService }) => {
        try {
          const { analyticsId } = request.params;
          const { deleteDestIndex, deleteDestIndexPattern } = request.query;
          let destinationIndex: string | undefined;
          const analyticsJobDeleted: DeleteDataFrameAnalyticsWithIndexStatus = { success: false };
          const destIndexDeleted: DeleteDataFrameAnalyticsWithIndexStatus = { success: false };
          const destIndexPatternDeleted: DeleteDataFrameAnalyticsWithIndexStatus = {
            success: false,
          };

          try {
            // Check if analyticsId is valid and get destination index
            const body = await mlClient.getDataFrameAnalytics({
              id: analyticsId,
            });
            if (Array.isArray(body.data_frame_analytics) && body.data_frame_analytics.length > 0) {
              destinationIndex = body.data_frame_analytics[0].dest.index;
            }
          } catch (e) {
            // exist early if the job doesn't exist
            return response.customError(wrapError(e));
          }

          if (deleteDestIndex || deleteDestIndexPattern) {
            // If user checks box to delete the destinationIndex associated with the job
            if (destinationIndex && deleteDestIndex) {
              // Verify if user has privilege to delete the destination index
              const userCanDeleteDestIndex = await userCanDeleteIndex(client, destinationIndex);
              // If user does have privilege to delete the index, then delete the index
              if (userCanDeleteDestIndex) {
                try {
                  await client.asCurrentUser.indices.delete({
                    index: destinationIndex,
                  });
                  destIndexDeleted.success = true;
                } catch ({ body }) {
                  destIndexDeleted.error = body;
                }
              } else {
                return response.forbidden();
              }
            }

            // Delete the index pattern if there's an index pattern that matches the name of dest index
            if (destinationIndex && deleteDestIndexPattern) {
              try {
                const dataViewsService = await getDataViewsService();
                const dataViewId = await getDataViewId(dataViewsService, destinationIndex);
                if (dataViewId) {
                  await deleteDestDataViewById(dataViewsService, dataViewId);
                }
                destIndexPatternDeleted.success = true;
              } catch (deleteDestIndexPatternError) {
                destIndexPatternDeleted.error = deleteDestIndexPatternError;
              }
            }
          }
          // Grab the target index from the data frame analytics job id
          // Delete the data frame analytics

          try {
            await mlClient.deleteDataFrameAnalytics({
              id: analyticsId,
            });
            analyticsJobDeleted.success = true;
          } catch ({ body }) {
            analyticsJobDeleted.error = body;
          }
          const results = {
            analyticsJobDeleted,
            destIndexDeleted,
            destIndexPatternDeleted,
          };
          return response.ok({
            body: results,
          });
        } catch (e) {
          return response.customError(wrapError(e));
        }
      }
    )
  );

  /**
   * @apiGroup DataFrameAnalytics
   *
   * @api {post} /api/ml/data_frame/analytics/:analyticsId/_start Start specified analytics job
   * @apiName StartDataFrameAnalyticsJob
   * @apiDescription Starts a data frame analytics job.
   *
   * @apiSchema (params) analyticsIdSchema
   */
  router.post(
    {
      path: '/api/ml/data_frame/analytics/{analyticsId}/_start',
      validate: {
        params: analyticsIdSchema,
      },
      options: {
        tags: ['access:ml:canStartStopDataFrameAnalytics'],
      },
    },
    routeGuard.fullLicenseAPIGuard(async ({ mlClient, request, response }) => {
      try {
        const { analyticsId } = request.params;
        const body = await mlClient.startDataFrameAnalytics({
          id: analyticsId,
        });
        return response.ok({
          body,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup DataFrameAnalytics
   *
   * @api {post} /api/ml/data_frame/analytics/:analyticsId/_stop Stop specified analytics job
   * @apiName StopsDataFrameAnalyticsJob
   * @apiDescription Stops a data frame analytics job.
   *
   * @apiSchema (params) analyticsIdSchema
   * @apiSchema (query) stopsDataFrameAnalyticsJobQuerySchema
   */
  router.post(
    {
      path: '/api/ml/data_frame/analytics/{analyticsId}/_stop',
      validate: {
        params: analyticsIdSchema,
        query: stopsDataFrameAnalyticsJobQuerySchema,
      },
      options: {
        tags: ['access:ml:canStartStopDataFrameAnalytics'],
      },
    },
    routeGuard.fullLicenseAPIGuard(async ({ mlClient, request, response }) => {
      try {
        const body = await mlClient.stopDataFrameAnalytics({
          id: request.params.analyticsId,
          force: request.query.force,
        });

        return response.ok({
          body,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup DataFrameAnalytics
   *
   * @api {post} /api/ml/data_frame/analytics/:analyticsId/_update Update specified analytics job
   * @apiName UpdateDataFrameAnalyticsJob
   * @apiDescription Updates a data frame analytics job.
   *
   * @apiSchema (params) analyticsIdSchema
   */
  router.post(
    {
      path: '/api/ml/data_frame/analytics/{analyticsId}/_update',
      validate: {
        params: analyticsIdSchema,
        body: dataAnalyticsJobUpdateSchema,
      },
      options: {
        tags: ['access:ml:canCreateDataFrameAnalytics'],
      },
    },
    routeGuard.fullLicenseAPIGuard(async ({ mlClient, request, response }) => {
      try {
        const { analyticsId } = request.params;
        const body = await mlClient.updateDataFrameAnalytics(
          {
            id: analyticsId,
            body: request.body,
          },
          getAuthorizationHeader(request)
        );
        return response.ok({
          body,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup DataFrameAnalytics
   *
   * @api {get} /api/ml/data_frame/analytics/:analyticsId/messages Get analytics job messages
   * @apiName GetDataFrameAnalyticsMessages
   * @apiDescription Returns the list of audit messages for data frame analytics jobs.
   *
   * @apiSchema (params) analyticsIdSchema
   */
  router.get(
    {
      path: '/api/ml/data_frame/analytics/{analyticsId}/messages',
      validate: {
        params: analyticsIdSchema,
      },
      options: {
        tags: ['access:ml:canGetDataFrameAnalytics'],
      },
    },
    routeGuard.fullLicenseAPIGuard(async ({ client, request, response }) => {
      try {
        const { analyticsId } = request.params;
        const { getAnalyticsAuditMessages } = analyticsAuditMessagesProvider(client);

        const results = await getAnalyticsAuditMessages(analyticsId);
        return response.ok({
          body: results,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup DataFrameAnalytics
   *
   * @api {post} /api/ml/data_frame/analytics/jobs_exist Check whether jobs exist in current or any space
   * @apiName JobsExist
   * @apiDescription Checks if each of the jobs in the specified list of IDs exists.
   *                 If allSpaces is true, the check will look across all spaces.
   *
   * @apiSchema (params) jobsExistSchema
   */
  router.post(
    {
      path: '/api/ml/data_frame/analytics/jobs_exist',
      validate: {
        body: jobsExistSchema,
      },
      options: {
        tags: ['access:ml:canGetDataFrameAnalytics'],
      },
    },
    routeGuard.fullLicenseAPIGuard(async ({ client, mlClient, request, response }) => {
      try {
        const { analyticsIds, allSpaces } = request.body;
        const results: { [id: string]: { exists: boolean } } = {};
        for (const id of analyticsIds) {
          try {
            const body = allSpaces
              ? await client.asInternalUser.ml.getDataFrameAnalytics({
                  id,
                })
              : await mlClient.getDataFrameAnalytics({
                  id,
                });
            results[id] = { exists: body.data_frame_analytics.length > 0 };
          } catch (error) {
            if (error.statusCode !== 404) {
              throw error;
            }
            results[id] = { exists: false };
          }
        }

        return response.ok({
          body: results,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup DataFrameAnalytics
   *
   * @api {get} /api/ml/data_frame/analytics/map/:analyticsId Get objects leading up to analytics job
   * @apiName GetDataFrameAnalyticsIdMap
   * @apiDescription Returns map of objects leading up to analytics job.
   *
   * @apiParam {String} analyticsId Analytics ID.
   */
  router.get(
    {
      path: '/api/ml/data_frame/analytics/map/{analyticsId}',
      validate: {
        params: analyticsIdSchema,
        query: analyticsMapQuerySchema,
      },
    },
    routeGuard.fullLicenseAPIGuard(async ({ mlClient, client, request, response }) => {
      try {
        const { analyticsId } = request.params;
        const treatAsRoot = request.query?.treatAsRoot;
        const type = request.query?.type;

        let results;
        if (treatAsRoot === 'true' || treatAsRoot === true) {
          // @ts-expect-error never used as analyticsId
          results = await getExtendedMap(mlClient, client, {
            analyticsId: type !== JOB_MAP_NODE_TYPES.INDEX ? analyticsId : undefined,
            index: type === JOB_MAP_NODE_TYPES.INDEX ? analyticsId : undefined,
          });
        } else {
          // @ts-expect-error never used as analyticsId
          results = await getAnalyticsMap(mlClient, client, {
            analyticsId: type !== JOB_MAP_NODE_TYPES.TRAINED_MODEL ? analyticsId : undefined,
            modelId: type === JOB_MAP_NODE_TYPES.TRAINED_MODEL ? analyticsId : undefined,
          });
        }

        return response.ok({
          body: results,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup DataFrameAnalytics
   *
   * @api {get} /api/ml/data_frame/analytics/new_job_caps/:indexPattern Get fields for a pattern of indices used for analytics
   * @apiName AnalyticsNewJobCaps
   * @apiDescription Retrieve the index fields for analytics
   */
  router.get(
    {
      path: '/api/ml/data_frame/analytics/new_job_caps/{indexPattern}',
      validate: {
        params: analyticsNewJobCapsParamsSchema,
        query: analyticsNewJobCapsQuerySchema,
      },
      options: {
        tags: ['access:ml:canGetJobs'],
      },
    },
    routeGuard.fullLicenseAPIGuard(async ({ client, request, response, getDataViewsService }) => {
      try {
        const { indexPattern } = request.params;
        const isRollup = request.query?.rollup === 'true';
        const dataViewsService = await getDataViewsService();
        const fieldService = fieldServiceProvider(indexPattern, isRollup, client, dataViewsService);
        const { fields, aggs } = await fieldService.getData(true);
        convertForStringify(aggs, fields);

        return response.ok({
          body: {
            [indexPattern]: {
              aggs,
              fields,
            },
          },
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup DataFrameAnalytics
   *
   * @api {post} /api/ml/data_frame/validate Validate the data frame analytics job config
   * @apiName ValidateDataFrameAnalytics
   * @apiDescription Validates the data frame analytics job config.
   *
   * @apiSchema (body) dataAnalyticsJobConfigSchema
   */
  router.post(
    {
      path: '/api/ml/data_frame/analytics/validate',
      validate: {
        body: dataAnalyticsJobConfigSchema,
      },
      options: {
        tags: ['access:ml:canCreateDataFrameAnalytics'],
      },
    },
    routeGuard.fullLicenseAPIGuard(async ({ client, request, response }) => {
      const jobConfig = request.body;
      try {
        // @ts-expect-error DFA schemas are incorrect
        const results = await validateAnalyticsJob(client, jobConfig);
        return response.ok({
          body: results,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );
}
