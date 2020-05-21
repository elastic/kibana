/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RequestHandlerContext } from 'kibana/server';
import { i18n } from '@kbn/i18n';
import { wrapError } from '../client/error_wrapper';
import { analyticsAuditMessagesProvider } from '../models/data_frame_analytics/analytics_audit_messages';
import { RouteInitialization } from '../types';
import {
  dataAnalyticsJobConfigSchema,
  dataAnalyticsEvaluateSchema,
  dataAnalyticsExplainSchema,
  analyticsIdSchema,
  stopsDataFrameAnalyticsJobQuerySchema,
  analyticsIdIndexSchema,
} from './schemas/data_analytics_schema';
import { IndexPatternHandler } from '../models/data_frame_analytics/index_patterns';

function getIndexPatternId(context: RequestHandlerContext, patternName: string) {
  const iph = new IndexPatternHandler(context.core.savedObjects.client);
  return iph.getIndexPatternId(patternName);
}

function deleteIndexPatternById(context: RequestHandlerContext, indexPatternId: string) {
  const iph = new IndexPatternHandler(context.core.savedObjects.client);
  return iph.deleteIndexPatternById(indexPatternId);
}

/**
 * Routes for the data frame analytics
 */
export function dataFrameAnalyticsRoutes({ router, mlLicense }: RouteInitialization) {
  async function userCanDeleteIndex(
    context: RequestHandlerContext,
    destinationIndex: string
  ): Promise<boolean> {
    if (!mlLicense.isSecurityEnabled()) {
      return true;
    }
    let privilege;
    try {
      privilege = await context.ml!.mlClient.callAsCurrentUser('ml.privilegeCheck', {
        body: {
          index: [
            {
              names: [destinationIndex], // uses wildcard
              privileges: ['delete_index'],
            },
          ],
        },
      });
      return privilege.index[destinationIndex].delete_index === true;
    } catch (err) {
      throw err;
    }
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
    mlLicense.fullLicenseAPIGuard(async (context, request, response) => {
      try {
        const results = await context.ml!.mlClient.callAsCurrentUser('ml.getDataFrameAnalytics');
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
    mlLicense.fullLicenseAPIGuard(async (context, request, response) => {
      try {
        const { analyticsId } = request.params;
        const results = await context.ml!.mlClient.callAsCurrentUser('ml.getDataFrameAnalytics', {
          analyticsId,
        });
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
    mlLicense.fullLicenseAPIGuard(async (context, request, response) => {
      try {
        const results = await context.ml!.mlClient.callAsCurrentUser(
          'ml.getDataFrameAnalyticsStats'
        );
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
    mlLicense.fullLicenseAPIGuard(async (context, request, response) => {
      try {
        const { analyticsId } = request.params;
        const results = await context.ml!.mlClient.callAsCurrentUser(
          'ml.getDataFrameAnalyticsStats',
          {
            analyticsId,
          }
        );
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
    mlLicense.fullLicenseAPIGuard(async (context, request, response) => {
      try {
        const { analyticsId } = request.params;
        const results = await context.ml!.mlClient.callAsCurrentUser(
          'ml.createDataFrameAnalytics',
          {
            body: request.body,
            analyticsId,
          }
        );
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
    mlLicense.fullLicenseAPIGuard(async (context, request, response) => {
      try {
        const results = await context.ml!.mlClient.callAsCurrentUser(
          'ml.evaluateDataFrameAnalytics',
          {
            body: request.body,
          }
        );
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
    mlLicense.fullLicenseAPIGuard(async (context, request, response) => {
      try {
        const results = await context.ml!.mlClient.callAsCurrentUser(
          'ml.explainDataFrameAnalytics',
          {
            body: request.body,
          }
        );
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
        query: analyticsIdIndexSchema,
      },
      options: {
        tags: ['access:ml:canDeleteDataFrameAnalytics'],
      },
    },
    mlLicense.fullLicenseAPIGuard(async (context, request, response) => {
      try {
        const { analyticsId } = request.params;
        const { deleteTargetIndex, deleteIndexPattern } = request.query;
        const errorsEncountered = [];
        let destinationIndex: string | undefined;
        let deleteTargetIndexAcknowledged: boolean = false;
        let deleteIndexPatternAcknowledged: boolean = false;

        // Check if analyticsId is valid and get destination index
        if (deleteTargetIndex || deleteIndexPattern) {
          try {
            const dfa = await context.ml!.mlClient.callAsCurrentUser('ml.getDataFrameAnalytics', {
              analyticsId,
            });
            if (Array.isArray(dfa.data_frame_analytics) && dfa.data_frame_analytics.length > 0) {
              destinationIndex = dfa.data_frame_analytics[0].dest.index;
            }
          } catch (e) {
            return response.customError(wrapError(e));
          }

          // If user checks box to delete the destinationIndex associated with the job
          if (destinationIndex && deleteTargetIndex) {
            // Verify if user has privilege to delete the destination index
            const userCanDeleteDestIndex = await userCanDeleteIndex(context, destinationIndex);
            // If user does have privilege to delete the index, then delete the index
            if (userCanDeleteDestIndex) {
              try {
                await context.ml!.mlClient.callAsCurrentUser('indices.delete', {
                  index: destinationIndex,
                });
                deleteTargetIndexAcknowledged = true;
              } catch (deleteIndexError) {
                errorsEncountered.push({
                  msg: i18n.translate(
                    'xpack.ml.dataframe.analyticsList.errorDeleteIndexNotificationErrorMessage',
                    {
                      defaultMessage:
                        'An error occurred deleting destination index {destinationIndex}: {error}',
                      values: {
                        destinationIndex,
                        error: JSON.stringify(deleteIndexError),
                      },
                    }
                  ),
                });
              }
            } else {
              return response.forbidden();
            }
          }

          // Delete the index pattern if there's an index pattern that matches the name of dest index
          if (destinationIndex && deleteIndexPattern) {
            try {
              const indexPatternId = await getIndexPatternId(context, destinationIndex);
              if (indexPatternId) {
                await deleteIndexPatternById(context, indexPatternId);
              }
              deleteIndexPatternAcknowledged = true;
            } catch (deleteIndexPatternError) {
              errorsEncountered.push({
                msg: i18n.translate(
                  'xpack.ml.dataframe.analyticsList.errorDeleteIndexPatternNotificationErrorMessage',
                  {
                    defaultMessage:
                      'An error occurred deleting index pattern {destinationIndex}: {error}',
                    values: {
                      destinationIndex,
                      error: JSON.stringify(deleteIndexPatternError),
                    },
                  }
                ),
              });
            }
          }
        }
        // Grab the target index from the data frame analytics job id
        // Delete the data frame analytics
        let results = await context.ml!.mlClient.callAsCurrentUser('ml.deleteDataFrameAnalytics', {
          analyticsId,
        });

        results = {
          ...results,
          deleteTargetIndexAcknowledged,
          deleteIndexPatternAcknowledged,
          errors: errorsEncountered,
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
    mlLicense.fullLicenseAPIGuard(async (context, request, response) => {
      try {
        const { analyticsId } = request.params;
        const results = await context.ml!.mlClient.callAsCurrentUser('ml.startDataFrameAnalytics', {
          analyticsId,
        });
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
    mlLicense.fullLicenseAPIGuard(async (context, request, response) => {
      try {
        const options: { analyticsId: string; force?: boolean | undefined } = {
          analyticsId: request.params.analyticsId,
        };
        // @ts-ignore TODO: update types
        if (request.url?.query?.force !== undefined) {
          // @ts-ignore TODO: update types
          options.force = request.url.query.force;
        }

        const results = await context.ml!.mlClient.callAsCurrentUser(
          'ml.stopDataFrameAnalytics',
          options
        );
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
    mlLicense.fullLicenseAPIGuard(async (context, request, response) => {
      try {
        const { analyticsId } = request.params;
        const { getAnalyticsAuditMessages } = analyticsAuditMessagesProvider(
          context.ml!.mlClient.callAsCurrentUser
        );

        const results = await getAnalyticsAuditMessages(analyticsId);
        return response.ok({
          body: results,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );
}
