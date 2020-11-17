/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RequestHandlerContext, IScopedClusterClient } from 'kibana/server';
import { wrapError } from '../client/error_wrapper';
import { analyticsAuditMessagesProvider } from '../models/data_frame_analytics/analytics_audit_messages';
import { RouteInitialization } from '../types';
import { JOB_MAP_NODE_TYPES } from '../../common/constants/data_frame_analytics';
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
} from './schemas/data_analytics_schema';
import { IndexPatternHandler } from '../models/data_frame_analytics/index_patterns';
import { AnalyticsManager } from '../models/data_frame_analytics/analytics_manager';
import { DeleteDataFrameAnalyticsWithIndexStatus } from '../../common/types/data_frame_analytics';
import { getAuthorizationHeader } from '../lib/request_authorization';
import { DataFrameAnalyticsConfig } from '../../common/types/data_frame_analytics';
import type { MlClient } from '../lib/ml_client';

function getIndexPatternId(context: RequestHandlerContext, patternName: string) {
  const iph = new IndexPatternHandler(context.core.savedObjects.client);
  return iph.getIndexPatternId(patternName);
}

function deleteDestIndexPatternById(context: RequestHandlerContext, indexPatternId: string) {
  const iph = new IndexPatternHandler(context.core.savedObjects.client);
  return iph.deleteIndexPatternById(indexPatternId);
}

function getAnalyticsMap(
  mlClient: MlClient,
  client: IScopedClusterClient,
  { analyticsId, modelId }: { analyticsId?: string; modelId?: string }
) {
  const analytics = new AnalyticsManager(mlClient, client.asInternalUser);
  return analytics.getAnalyticsMap({ analyticsId, modelId });
}

function getExtendedMap(
  mlClient: MlClient,
  client: IScopedClusterClient,
  { analyticsId, index }: { analyticsId?: string; index?: string }
) {
  const analytics = new AnalyticsManager(mlClient, client.asInternalUser);
  return analytics.extendAnalyticsMapForAnalyticsJob({ analyticsId, index });
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

    const { body } = await client.asCurrentUser.security.hasPrivileges({
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
      validate: false,
      options: {
        tags: ['access:ml:canGetDataFrameAnalytics'],
      },
    },
    routeGuard.fullLicenseAPIGuard(async ({ mlClient, response }) => {
      try {
        const { body } = await mlClient.getDataFrameAnalytics({ size: 1000 });
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
      },
      options: {
        tags: ['access:ml:canGetDataFrameAnalytics'],
      },
    },
    routeGuard.fullLicenseAPIGuard(async ({ mlClient, request, response }) => {
      try {
        const { analyticsId } = request.params;
        const { body } = await mlClient.getDataFrameAnalytics({
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
        const { body } = await mlClient.getDataFrameAnalyticsStats({ size: 1000 });
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
        const { body } = await mlClient.getDataFrameAnalyticsStats({
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
        const { body } = await mlClient.putDataFrameAnalytics(
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
        const { body } = await mlClient.evaluateDataFrame(
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
        const { body } = await mlClient.explainDataFrameAnalytics(
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
    routeGuard.fullLicenseAPIGuard(async ({ mlClient, client, request, response, context }) => {
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
          const { body } = await mlClient.getDataFrameAnalytics({
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
              const indexPatternId = await getIndexPatternId(context, destinationIndex);
              if (indexPatternId) {
                await deleteDestIndexPatternById(context, indexPatternId);
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
    })
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
        const { body } = await mlClient.startDataFrameAnalytics({
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
        const { body } = await mlClient.stopDataFrameAnalytics({
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
        const { body } = await mlClient.updateDataFrameAnalytics(
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
   * @api {post} /api/ml/data_frame/analytics/job_exists Check whether jobs exists in current or any space
   * @apiName JobExists
   * @apiDescription Checks if each of the jobs in the specified list of IDs exist.
   *                 If allSpaces is true, the check will look across all spaces.
   *
   * @apiSchema (params) analyticsIdSchema
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
        const results: { [id: string]: boolean } = {};
        for (const id of analyticsIds) {
          try {
            const { body } = allSpaces
              ? await client.asInternalUser.ml.getDataFrameAnalytics<{
                  data_frame_analytics: DataFrameAnalyticsConfig[];
                }>({
                  id,
                })
              : await mlClient.getDataFrameAnalytics<{
                  data_frame_analytics: DataFrameAnalyticsConfig[];
                }>({
                  id,
                });
            results[id] = body.data_frame_analytics.length > 0;
          } catch (error) {
            if (error.statusCode !== 404) {
              throw error;
            }
            results[id] = false;
          }
        }

        return response.ok({
          body: { results },
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
          results = await getExtendedMap(mlClient, client, {
            analyticsId: type !== JOB_MAP_NODE_TYPES.INDEX ? analyticsId : undefined,
            index: type === JOB_MAP_NODE_TYPES.INDEX ? analyticsId : undefined,
          });
        } else {
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
}
