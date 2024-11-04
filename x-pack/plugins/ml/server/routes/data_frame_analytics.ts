/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient } from '@kbn/core/server';
import type { RuntimeField } from '@kbn/data-views-plugin/common';
import type { Field, Aggregation } from '@kbn/ml-anomaly-utils';
import {
  JOB_MAP_NODE_TYPES,
  type DeleteDataFrameAnalyticsWithIndexStatus,
} from '@kbn/ml-data-frame-analytics-utils';
import type { CloudSetup } from '@kbn/cloud-plugin/server';
import { dataViewCreateQuerySchema } from '@kbn/ml-data-view-utils/schemas/api_create_query_schema';
import { createDataViewFn } from '@kbn/ml-data-view-utils/actions/create';
import { deleteDataViewFn } from '@kbn/ml-data-view-utils/actions/delete';

import { type MlFeatures, ML_INTERNAL_BASE_PATH } from '../../common/constants/app';
import { wrapError } from '../client/error_wrapper';
import { analyticsAuditMessagesProvider } from '../models/data_frame_analytics/analytics_audit_messages';
import type { RouteInitialization } from '../types';
import {
  dataFrameAnalyticsJobConfigSchema,
  dataFrameAnalyticsJobUpdateSchema,
  dataFrameAnalyticsEvaluateSchema,
  dataFrameAnalyticsExplainSchema,
  dataFrameAnalyticsIdSchema,
  dataFrameAnalyticsMapQuerySchema,
  stopsDataFrameAnalyticsJobQuerySchema,
  deleteDataFrameAnalyticsJobSchema,
  dataFrameAnalyticsJobsExistSchema,
  dataFrameAnalyticsQuerySchema,
  dataFrameAnalyticsNewJobCapsParamsSchema,
  dataFrameAnalyticsNewJobCapsQuerySchema,
  type PutDataFrameAnalyticsResponseSchema,
} from './schemas/data_frame_analytics_schema';
import type { ExtendAnalyticsMapArgs } from '../models/data_frame_analytics/types';
import { AnalyticsManager } from '../models/data_frame_analytics/analytics_manager';
import { validateAnalyticsJob } from '../models/data_frame_analytics/validation';
import { fieldServiceProvider } from '../models/job_service/new_job_caps/field_service';
import { getAuthorizationHeader } from '../lib/request_authorization';
import type { MlClient } from '../lib/ml_client';

function getExtendedMap(
  mlClient: MlClient,
  client: IScopedClusterClient,
  idOptions: ExtendAnalyticsMapArgs,
  enabledFeatures: MlFeatures,
  cloud: CloudSetup
) {
  const analytics = new AnalyticsManager(mlClient, client, enabledFeatures, cloud);
  return analytics.extendAnalyticsMapForAnalyticsJob(idOptions);
}

function getExtendedModelsMap(
  mlClient: MlClient,
  client: IScopedClusterClient,
  idOptions: {
    analyticsId?: string;
    modelId?: string;
  },
  enabledFeatures: MlFeatures,
  cloud: CloudSetup
) {
  const analytics = new AnalyticsManager(mlClient, client, enabledFeatures, cloud);
  return analytics.extendModelsMap(idOptions);
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
export function dataFrameAnalyticsRoutes(
  { router, mlLicense, routeGuard, getEnabledFeatures }: RouteInitialization,
  cloud: CloudSetup
) {
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

  router.versioned
    .get({
      path: `${ML_INTERNAL_BASE_PATH}/data_frame/analytics`,
      access: 'internal',
      options: {
        tags: ['access:ml:canGetDataFrameAnalytics'],
      },
      summary: 'Gets data frame analytics',
      description: 'Returns the list of data frame analytics jobs.',
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            query: dataFrameAnalyticsQuerySchema,
          },
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

  router.versioned
    .get({
      path: `${ML_INTERNAL_BASE_PATH}/data_frame/analytics/{analyticsId}`,
      access: 'internal',
      options: {
        tags: ['access:ml:canGetDataFrameAnalytics'],
      },
      summary: 'Gets data frame analytics by id',
      description: 'Returns the data frame analytics job by id.',
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: dataFrameAnalyticsIdSchema,
            query: dataFrameAnalyticsQuerySchema,
          },
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

  router.versioned
    .get({
      path: `${ML_INTERNAL_BASE_PATH}/data_frame/analytics/_stats`,
      access: 'internal',
      options: {
        tags: ['access:ml:canGetDataFrameAnalytics'],
      },
      summary: 'Gets data frame analytics stats',
      description: 'Returns the data frame analytics job statistics.',
    })
    .addVersion(
      {
        version: '1',
        validate: false,
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

  router.versioned
    .get({
      path: `${ML_INTERNAL_BASE_PATH}/data_frame/analytics/{analyticsId}/_stats`,
      access: 'internal',
      options: {
        tags: ['access:ml:canGetDataFrameAnalytics'],
      },
      summary: 'Gets data frame analytics stats by id',
      description: 'Returns the data frame analytics job statistics by id.',
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: dataFrameAnalyticsIdSchema,
          },
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

  router.versioned
    .put({
      path: `${ML_INTERNAL_BASE_PATH}/data_frame/analytics/{analyticsId}`,
      access: 'internal',
      options: {
        tags: ['access:ml:canCreateDataFrameAnalytics'],
      },
      summary: 'Updates data frame analytics job',
      description:
        'This API creates a data frame analytics job that performs an analysis on the source index and stores the outcome in a destination index.',
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: dataFrameAnalyticsIdSchema,
            query: dataViewCreateQuerySchema,
            body: dataFrameAnalyticsJobConfigSchema,
          },
        },
      },
      routeGuard.fullLicenseAPIGuard(
        async ({ mlClient, request, response, getDataViewsService }) => {
          const { analyticsId } = request.params;
          const { createDataView, timeFieldName } = request.query;

          const fullResponse: PutDataFrameAnalyticsResponseSchema = {
            dataFrameAnalyticsJobsCreated: [],
            dataFrameAnalyticsJobsErrors: [],
            dataViewsCreated: [],
            dataViewsErrors: [],
          };

          try {
            const resp = await mlClient.putDataFrameAnalytics(
              {
                id: analyticsId,
                // @ts-expect-error @elastic-elasticsearch Data frame types incomplete
                body: request.body,
              },
              getAuthorizationHeader(request)
            );

            if (resp.id && resp.create_time) {
              fullResponse.dataFrameAnalyticsJobsCreated.push({ id: analyticsId });
            } else {
              fullResponse.dataFrameAnalyticsJobsErrors.push({
                id: analyticsId,
                error: wrapError(resp),
              });
            }
          } catch (e) {
            fullResponse.dataFrameAnalyticsJobsErrors.push({
              id: analyticsId,
              error: wrapError(e),
            });
          }

          if (createDataView) {
            const { dataViewsCreated, dataViewsErrors } = await createDataViewFn({
              dataViewsService: await getDataViewsService(),
              dataViewName: request.body.dest.index,
              runtimeMappings: request.body.source.runtime_mappings as Record<string, RuntimeField>,
              timeFieldName,
              errorFallbackId: analyticsId,
            });

            fullResponse.dataViewsCreated = dataViewsCreated;
            fullResponse.dataViewsErrors = dataViewsErrors;
          }

          return response.ok({ body: fullResponse });
        }
      )
    );

  router.versioned
    .post({
      path: `${ML_INTERNAL_BASE_PATH}/data_frame/_evaluate`,
      access: 'internal',
      options: {
        tags: ['access:ml:canGetDataFrameAnalytics'],
      },
      summary: 'Evaluates the data frame analytics',
      description: 'Evaluates the data frame analytics for an annotated index.',
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: dataFrameAnalyticsEvaluateSchema,
          },
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

  router.versioned
    .post({
      path: `${ML_INTERNAL_BASE_PATH}/data_frame/analytics/_explain`,
      access: 'internal',
      options: {
        tags: ['access:ml:canCreateDataFrameAnalytics'],
      },
      summary: 'Explains a data frame analytics job config',
      description:
        'This API provides explanations for a data frame analytics job config that either exists already or one that has not been created yet.',
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: dataFrameAnalyticsExplainSchema,
          },
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

  router.versioned
    .delete({
      path: `${ML_INTERNAL_BASE_PATH}/data_frame/analytics/{analyticsId}`,
      access: 'internal',
      options: {
        tags: ['access:ml:canDeleteDataFrameAnalytics'],
      },
      summary: 'Deletes data frame analytics job',
      description: 'Deletes specified data frame analytics job.',
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: dataFrameAnalyticsIdSchema,
            query: deleteDataFrameAnalyticsJobSchema,
          },
        },
      },
      routeGuard.fullLicenseAPIGuard(
        async ({ mlClient, client, request, response, getDataViewsService }) => {
          try {
            const { analyticsId } = request.params;
            const { deleteDestIndex, deleteDestDataView, force } = request.query;
            let destinationIndex: string | undefined;
            const analyticsJobDeleted: DeleteDataFrameAnalyticsWithIndexStatus = { success: false };
            const destIndexDeleted: DeleteDataFrameAnalyticsWithIndexStatus = { success: false };
            let destDataViewDeleted: DeleteDataFrameAnalyticsWithIndexStatus = {
              success: false,
            };

            try {
              // Check if analyticsId is valid and get destination index
              const body = await mlClient.getDataFrameAnalytics({
                id: analyticsId,
              });
              if (
                Array.isArray(body.data_frame_analytics) &&
                body.data_frame_analytics.length > 0
              ) {
                destinationIndex = body.data_frame_analytics[0].dest.index;
              }
            } catch (e) {
              // exit early if the job doesn't exist
              return response.customError(wrapError(e));
            }

            if (deleteDestIndex || deleteDestDataView) {
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

              // Delete the data view if there's a data view that matches the name of dest index
              if (destinationIndex && deleteDestDataView) {
                destDataViewDeleted = await deleteDataViewFn({
                  dataViewsService: await getDataViewsService(),
                  dataViewName: destinationIndex,
                });
              }
            }
            // Grab the target index from the data frame analytics job id
            // Delete the data frame analytics

            try {
              await mlClient.deleteDataFrameAnalytics({
                id: analyticsId,
                force,
              });
              analyticsJobDeleted.success = true;
            } catch ({ body }) {
              analyticsJobDeleted.error = body;
            }
            const results = {
              analyticsJobDeleted,
              destIndexDeleted,
              destDataViewDeleted,
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

  router.versioned
    .post({
      path: `${ML_INTERNAL_BASE_PATH}/data_frame/analytics/{analyticsId}/_start`,
      access: 'internal',
      options: {
        tags: ['access:ml:canStartStopDataFrameAnalytics'],
      },
      summary: 'Starts specified analytics job',
      description: 'Starts a data frame analytics job.',
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: dataFrameAnalyticsIdSchema,
          },
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

  router.versioned
    .post({
      path: `${ML_INTERNAL_BASE_PATH}/data_frame/analytics/{analyticsId}/_stop`,
      access: 'internal',
      options: {
        tags: ['access:ml:canStartStopDataFrameAnalytics'],
      },
      summary: 'Stops specified analytics job',
      description: 'Stops a data frame analytics job.',
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: dataFrameAnalyticsIdSchema,
            query: stopsDataFrameAnalyticsJobQuerySchema,
          },
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

  router.versioned
    .post({
      path: `${ML_INTERNAL_BASE_PATH}/data_frame/analytics/{analyticsId}/_update`,
      access: 'internal',
      options: {
        tags: ['access:ml:canCreateDataFrameAnalytics'],
      },
      summary: 'Updates specified analytics job',
      description: 'Updates a data frame analytics job.',
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: dataFrameAnalyticsIdSchema,
            body: dataFrameAnalyticsJobUpdateSchema,
          },
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

  router.versioned
    .get({
      path: `${ML_INTERNAL_BASE_PATH}/data_frame/analytics/{analyticsId}/messages`,
      access: 'internal',
      options: {
        tags: ['access:ml:canGetDataFrameAnalytics'],
      },
      summary: 'Gets data frame analytics messages',
      description: 'Returns the list of audit messages for data frame analytics jobs.',
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: dataFrameAnalyticsIdSchema,
          },
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

  router.versioned
    .post({
      path: `${ML_INTERNAL_BASE_PATH}/data_frame/analytics/jobs_exist`,
      access: 'internal',
      options: {
        tags: ['access:ml:canGetDataFrameAnalytics'],
      },
      summary: 'Checks if jobs exist',
      description:
        'Checks if each of the jobs in the specified list of IDs exists. If allSpaces is true, the check will look across all spaces.',
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: dataFrameAnalyticsJobsExistSchema,
          },
        },
      },
      routeGuard.fullLicenseAPIGuard(async ({ client, mlClient, request, response }) => {
        try {
          const { analyticsIds, allSpaces } = request.body;
          const results: { [id: string]: { exists: boolean } } = Object.create(null);
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

  router.versioned
    .get({
      path: `${ML_INTERNAL_BASE_PATH}/data_frame/analytics/map/{analyticsId}`,
      access: 'internal',
      options: {
        tags: ['access:ml:canGetDataFrameAnalytics'],
      },
      summary: 'Gets a data frame analytics jobs map',
      description: 'Returns map of objects leading up to analytics job.',
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: dataFrameAnalyticsIdSchema,
            query: dataFrameAnalyticsMapQuerySchema,
          },
        },
      },
      routeGuard.fullLicenseAPIGuard(async ({ mlClient, client, request, response }) => {
        try {
          const { analyticsId } = request.params;
          const treatAsRoot = request.query?.treatAsRoot;
          const type = request.query?.type;

          let results;
          if (treatAsRoot === 'true' || treatAsRoot === true) {
            results = await getExtendedMap(
              mlClient,
              client,
              // @ts-expect-error never used as analyticsId
              {
                analyticsId: type !== JOB_MAP_NODE_TYPES.INDEX ? analyticsId : undefined,
                index: type === JOB_MAP_NODE_TYPES.INDEX ? analyticsId : undefined,
              },
              getEnabledFeatures(),
              cloud
            );
          } else {
            results = await getExtendedModelsMap(
              mlClient,
              client,
              {
                analyticsId: type !== JOB_MAP_NODE_TYPES.TRAINED_MODEL ? analyticsId : undefined,
                modelId: type === JOB_MAP_NODE_TYPES.TRAINED_MODEL ? analyticsId : undefined,
              },
              getEnabledFeatures(),
              cloud
            );
          }

          return response.ok({
            body: results,
          });
        } catch (e) {
          return response.customError(wrapError(e));
        }
      })
    );

  router.versioned
    .get({
      path: `${ML_INTERNAL_BASE_PATH}/data_frame/analytics/new_job_caps/{indexPattern}`,
      access: 'internal',
      options: {
        tags: ['access:ml:canGetJobs'],
      },
      summary: 'Get fields for a pattern of indices used for analytics',
      description: 'Returns the fields for a pattern of indices used for analytics.',
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: dataFrameAnalyticsNewJobCapsParamsSchema,
            query: dataFrameAnalyticsNewJobCapsQuerySchema,
          },
        },
      },
      routeGuard.fullLicenseAPIGuard(async ({ client, request, response, getDataViewsService }) => {
        try {
          const { indexPattern } = request.params;
          const isRollup = request.query?.rollup === 'true';
          const dataViewsService = await getDataViewsService();
          const fieldService = fieldServiceProvider(
            indexPattern,
            isRollup,
            client,
            dataViewsService
          );
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

  router.versioned
    .post({
      path: `${ML_INTERNAL_BASE_PATH}/data_frame/analytics/validate`,
      access: 'internal',
      options: {
        tags: ['access:ml:canCreateDataFrameAnalytics'],
      },
      summary: 'Validates the data frame analytics job config',
      description: 'Validates the data frame analytics job config.',
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: dataFrameAnalyticsJobConfigSchema,
          },
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
