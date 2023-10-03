/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import {
  ElasticsearchClient,
  KibanaResponseFactory,
  RequestHandler,
  RequestHandlerContext,
} from '@kbn/core/server';

import { DataViewsService } from '@kbn/data-views-plugin/common';
import type { TransportRequestOptions } from '@elastic/elasticsearch';
import { generateTransformSecondaryAuthHeaders } from '../../../common/utils/transform_api_key';
import {
  reauthorizeTransformsRequestSchema,
  ReauthorizeTransformsRequestSchema,
  ReauthorizeTransformsResponseSchema,
} from '../../../common/api_schemas/reauthorize_transforms';
import { addInternalBasePath, TRANSFORM_STATE } from '../../../common/constants';
import {
  transformIdParamSchema,
  ResponseStatus,
  TransformIdParamSchema,
} from '../../../common/api_schemas/common';
import {
  deleteTransformsRequestSchema,
  DeleteTransformsRequestSchema,
  DeleteTransformsResponseSchema,
} from '../../../common/api_schemas/delete_transforms';
import {
  resetTransformsRequestSchema,
  ResetTransformsRequestSchema,
  ResetTransformsResponseSchema,
} from '../../../common/api_schemas/reset_transforms';
import {
  startTransformsRequestSchema,
  StartTransformsRequestSchema,
  StartTransformsResponseSchema,
} from '../../../common/api_schemas/start_transforms';
import {
  stopTransformsRequestSchema,
  StopTransformsRequestSchema,
  StopTransformsResponseSchema,
} from '../../../common/api_schemas/stop_transforms';
import {
  scheduleNowTransformsRequestSchema,
  ScheduleNowTransformsRequestSchema,
  ScheduleNowTransformsResponseSchema,
} from '../../../common/api_schemas/schedule_now_transforms';
import {
  postTransformsUpdateRequestSchema,
  PostTransformsUpdateRequestSchema,
} from '../../../common/api_schemas/update_transforms';
import {
  postTransformsPreviewRequestSchema,
  PostTransformsPreviewRequestSchema,
  putTransformsRequestSchema,
  PutTransformsRequestSchema,
  PutTransformsResponseSchema,
} from '../../../common/api_schemas/transforms';

import { RouteDependencies } from '../../types';

import { isRequestTimeout, fillResultsWithTimeouts, wrapError, wrapEsError } from './error_utils';
import { registerTransformsAuditMessagesRoutes } from './transforms_audit_messages';
import { registerTransformNodesRoutes } from './transforms_nodes';
import { isLatestTransform } from '../../../common/types/transform';
import { isKeywordDuplicate } from '../../../common/utils/field_utils';
import { transformHealthServiceProvider } from '../../lib/alerting/transform_health_rule_type/transform_health_service';

enum TRANSFORM_ACTIONS {
  DELETE = 'delete',
  REAUTHORIZE = 'reauthorize',
  RESET = 'reset',
  SCHEDULE_NOW = 'schedule_now',
  STOP = 'stop',
  START = 'start',
}

export function registerTransformsRoutes(routeDependencies: RouteDependencies) {
  const { router, license, coreStart, dataViews, security: securityStart } = routeDependencies;
  /**
   * @apiGroup Transforms
   *
   * @api {get} /internal/transform/transforms Get transforms
   * @apiName GetTransforms
   * @apiDescription Returns transforms
   *
   * @apiSchema (params) jobAuditMessagesJobIdSchema
   * @apiSchema (query) jobAuditMessagesQuerySchema
   */
  router.versioned
    .get({
      path: addInternalBasePath('transforms'),
      access: 'internal',
    })
    .addVersion(
      {
        version: '1',
        validate: false,
      },
      license.guardApiRoute<estypes.TransformGetTransformRequest, undefined, undefined>(
        async (ctx, req, res) => {
          try {
            const esClient = (await ctx.core).elasticsearch.client;
            const body = await esClient.asCurrentUser.transform.getTransform({
              size: 1000,
              ...req.params,
            });

            const alerting = await ctx.alerting;
            if (alerting) {
              const transformHealthService = transformHealthServiceProvider({
                esClient: esClient.asCurrentUser,
                rulesClient: alerting.getRulesClient(),
              });

              // @ts-ignore
              await transformHealthService.populateTransformsWithAssignedRules(body.transforms);
            }

            return res.ok({ body });
          } catch (e) {
            return res.customError(wrapError(wrapEsError(e)));
          }
        }
      )
    );

  /**
   * @apiGroup Transforms
   *
   * @api {get} /internal/transform/transforms/:transformId Get transform
   * @apiName GetTransform
   * @apiDescription Returns a single transform
   *
   * @apiSchema (params) transformIdParamSchema
   */
  router.versioned
    .get({
      path: addInternalBasePath('transforms/{transformId}'),
      access: 'internal',
    })
    .addVersion<TransformIdParamSchema, undefined, undefined>(
      {
        version: '1',
        validate: {
          request: {
            params: transformIdParamSchema,
          },
        },
      },
      license.guardApiRoute<TransformIdParamSchema, undefined, undefined>(async (ctx, req, res) => {
        const { transformId } = req.params;
        try {
          const esClient = (await ctx.core).elasticsearch.client;
          const body = await esClient.asCurrentUser.transform.getTransform({
            transform_id: transformId,
          });
          return res.ok({ body });
        } catch (e) {
          return res.customError(wrapError(wrapEsError(e)));
        }
      })
    );

  /**
   * @apiGroup Transforms
   *
   * @api {get} /internal/transform/transforms/_stats Get transforms stats
   * @apiName GetTransformsStats
   * @apiDescription Returns transforms stats
   */
  router.versioned
    .get({
      path: addInternalBasePath('transforms/_stats'),
      access: 'internal',
    })
    .addVersion(
      {
        version: '1',
        validate: false,
      },
      license.guardApiRoute<estypes.TransformGetTransformStatsResponse, undefined, undefined>(
        async (ctx, req, res) => {
          try {
            const esClient = (await ctx.core).elasticsearch.client;
            const body = await esClient.asCurrentUser.transform.getTransformStats(
              {
                size: 1000,
                transform_id: '_all',
              },
              { maxRetries: 0 }
            );
            return res.ok({ body });
          } catch (e) {
            return res.customError(wrapError(wrapEsError(e)));
          }
        }
      )
    );

  /**
   * @apiGroup Transforms
   *
   * @api {get} /internal/transform/transforms/:transformId/_stats Get transform stats
   * @apiName GetTransformStats
   * @apiDescription Returns stats for a single transform
   *
   * @apiSchema (params) transformIdParamSchema
   */
  router.versioned
    .get({
      path: addInternalBasePath('transforms/{transformId}/_stats'),
      access: 'internal',
    })
    .addVersion<TransformIdParamSchema, undefined, undefined>(
      {
        version: '1',
        validate: {
          request: {
            params: transformIdParamSchema,
          },
        },
      },
      license.guardApiRoute<TransformIdParamSchema, undefined, undefined>(async (ctx, req, res) => {
        const { transformId } = req.params;
        try {
          const esClient = (await ctx.core).elasticsearch.client;
          const body = await esClient.asCurrentUser.transform.getTransformStats(
            {
              transform_id: transformId,
            },
            { maxRetries: 0 }
          );
          return res.ok({ body });
        } catch (e) {
          return res.customError(wrapError(wrapEsError(e)));
        }
      })
    );

  /**
   * @apiGroup Transforms
   *
   * @api {put} /internal/transform/transforms/:transformId Put transform
   * @apiName PutTransform
   * @apiDescription Creates a transform
   *
   * @apiSchema (params) transformIdParamSchema
   * @apiSchema (body) putTransformsRequestSchema
   */
  router.versioned
    .put({
      path: addInternalBasePath('transforms/{transformId}'),
      access: 'internal',
    })
    .addVersion<TransformIdParamSchema, undefined, PutTransformsRequestSchema>(
      {
        version: '1',
        validate: {
          request: {
            params: transformIdParamSchema,
            body: putTransformsRequestSchema,
          },
        },
      },
      license.guardApiRoute<TransformIdParamSchema, undefined, PutTransformsRequestSchema>(
        async (ctx, req, res) => {
          const { transformId } = req.params;

          const response: PutTransformsResponseSchema = {
            transformsCreated: [],
            errors: [],
          };

          const esClient = (await ctx.core).elasticsearch.client;
          await esClient.asCurrentUser.transform
            .putTransform({
              // @ts-expect-error @elastic/elasticsearch group_by is expected to be optional in TransformPivot
              body: req.body,
              transform_id: transformId,
            })
            .then(() => {
              response.transformsCreated.push({ transform: transformId });
            })
            .catch((e) =>
              response.errors.push({
                id: transformId,
                error: wrapEsError(e),
              })
            );

          return res.ok({ body: response });
        }
      )
    );

  /**
   * @apiGroup Transforms
   *
   * @api {post} /internal/transform/transforms/:transformId/_update Post transform update
   * @apiName PostTransformUpdate
   * @apiDescription Updates a transform
   *
   * @apiSchema (params) transformIdParamSchema
   * @apiSchema (body) postTransformsUpdateRequestSchema
   */
  router.versioned
    .post({
      path: addInternalBasePath('transforms/{transformId}/_update'),
      access: 'internal',
    })
    .addVersion<TransformIdParamSchema, undefined, PostTransformsUpdateRequestSchema>(
      {
        version: '1',
        validate: {
          request: {
            params: transformIdParamSchema,
            body: postTransformsUpdateRequestSchema,
          },
        },
      },
      license.guardApiRoute<TransformIdParamSchema, undefined, PostTransformsUpdateRequestSchema>(
        async (ctx, req, res) => {
          const { transformId } = req.params;

          try {
            const esClient = (await ctx.core).elasticsearch.client;
            const body = await esClient.asCurrentUser.transform.updateTransform({
              // @ts-expect-error query doesn't satisfy QueryDslQueryContainer from @elastic/elasticsearch
              body: req.body,
              transform_id: transformId,
            });
            return res.ok({
              body,
            });
          } catch (e) {
            return res.customError(wrapError(e));
          }
        }
      )
    );

  /**
   * @apiGroup Reauthorize transforms with API key generated from currently logged in user
   * @api {post} /internal/transform/reauthorize_transforms Post reauthorize transforms
   * @apiName Reauthorize Transforms
   * @apiDescription Reauthorize transforms by generating an API Key for current user
   * and update transform's es-secondary-authorization headers with the generated key,
   * then start the transform.
   * @apiSchema (body) reauthorizeTransformsRequestSchema
   */
  router.versioned
    .post({
      path: addInternalBasePath('reauthorize_transforms'),
      access: 'internal',
    })
    .addVersion<undefined, undefined, StartTransformsRequestSchema>(
      {
        version: '1',
        validate: {
          request: {
            body: reauthorizeTransformsRequestSchema,
          },
        },
      },
      license.guardApiRoute<undefined, undefined, StartTransformsRequestSchema>(
        async (ctx, req, res) => {
          try {
            const transformsInfo = req.body;
            const { elasticsearch } = coreStart;
            const esClient = elasticsearch.client.asScoped(req).asCurrentUser;

            let apiKeyWithCurrentUserPermission;

            // If security is not enabled or available, user should not have the need to reauthorize
            // in that case, start anyway
            if (securityStart) {
              apiKeyWithCurrentUserPermission =
                await securityStart.authc.apiKeys.grantAsInternalUser(req, {
                  name: `auto-generated-transform-api-key`,
                  role_descriptors: {},
                });
            }
            const secondaryAuth = generateTransformSecondaryAuthHeaders(
              apiKeyWithCurrentUserPermission
            );

            const authorizedTransforms = await reauthorizeAndStartTransforms(
              transformsInfo,
              esClient,
              {
                ...(secondaryAuth ? secondaryAuth : {}),
              }
            );
            return res.ok({ body: authorizedTransforms });
          } catch (e) {
            return res.customError(wrapError(wrapEsError(e)));
          }
        }
      )
    );

  /**
   * @apiGroup Transforms
   *
   * @api {post} /internal/transform/delete_transforms Post delete transforms
   * @apiName DeleteTransforms
   * @apiDescription Deletes transforms
   *
   * @apiSchema (body) deleteTransformsRequestSchema
   */
  router.versioned
    .post({
      path: addInternalBasePath('delete_transforms'),
      access: 'internal',
    })
    .addVersion<undefined, undefined, DeleteTransformsRequestSchema>(
      {
        version: '1',
        validate: {
          request: {
            body: deleteTransformsRequestSchema,
          },
        },
      },
      license.guardApiRoute<undefined, undefined, DeleteTransformsRequestSchema>(
        async (ctx, req, res) => {
          try {
            const { savedObjects, elasticsearch } = coreStart;
            const savedObjectsClient = savedObjects.getScopedClient(req);
            const esClient = elasticsearch.client.asScoped(req).asCurrentUser;

            const dataViewsService = await dataViews.dataViewsServiceFactory(
              savedObjectsClient,
              esClient,
              req
            );
            const body = await deleteTransforms(req.body, ctx, res, dataViewsService);

            if (body && body.status) {
              if (body.status === 404) {
                return res.notFound();
              }
              if (body.status === 403) {
                return res.forbidden();
              }
            }

            return res.ok({
              body,
            });
          } catch (e) {
            return res.customError(wrapError(wrapEsError(e)));
          }
        }
      )
    );

  /**
   * @apiGroup Transforms
   *
   * @api {post} /internal/transform/reset_transforms Post reset transforms
   * @apiName ResetTransforms
   * @apiDescription resets transforms
   *
   * @apiSchema (body) resetTransformsRequestSchema
   */
  router.versioned
    .post({
      path: addInternalBasePath('reset_transforms'),
      access: 'internal',
    })
    .addVersion<undefined, undefined, ResetTransformsRequestSchema>(
      {
        version: '1',
        validate: {
          request: {
            body: resetTransformsRequestSchema,
          },
        },
      },
      license.guardApiRoute<undefined, undefined, ResetTransformsRequestSchema>(
        async (ctx, req, res) => {
          try {
            const body = await resetTransforms(req.body, ctx, res);

            if (body && body.status) {
              if (body.status === 404) {
                return res.notFound();
              }
              if (body.status === 403) {
                return res.forbidden();
              }
            }

            return res.ok({
              body,
            });
          } catch (e) {
            return res.customError(wrapError(wrapEsError(e)));
          }
        }
      )
    );

  /**
   * @apiGroup Transforms
   *
   * @api {post} /internal/transform/transforms/_preview Preview transform
   * @apiName PreviewTransform
   * @apiDescription Previews transform
   *
   * @apiSchema (body) postTransformsPreviewRequestSchema
   */
  router.versioned
    .post({
      path: addInternalBasePath('transforms/_preview'),
      access: 'internal',
    })
    .addVersion<undefined, undefined, PostTransformsPreviewRequestSchema>(
      {
        version: '1',
        validate: {
          request: {
            body: postTransformsPreviewRequestSchema,
          },
        },
      },
      license.guardApiRoute<undefined, undefined, PostTransformsPreviewRequestSchema>(
        previewTransformHandler
      )
    );

  /**
   * @apiGroup Transforms
   *
   * @api {post} /internal/transform/start_transforms Start transforms
   * @apiName PostStartTransforms
   * @apiDescription Starts transform
   *
   * @apiSchema (body) startTransformsRequestSchema
   */
  router.versioned
    .post({
      path: addInternalBasePath('start_transforms'),
      access: 'internal',
    })
    .addVersion<undefined, undefined, StartTransformsRequestSchema>(
      {
        version: '1',
        validate: {
          request: {
            body: startTransformsRequestSchema,
          },
        },
      },
      license.guardApiRoute<undefined, undefined, StartTransformsRequestSchema>(
        startTransformsHandler
      )
    );

  /**
   * @apiGroup Transforms
   *
   * @api {post} /internal/transform/stop_transforms Stop transforms
   * @apiName PostStopTransforms
   * @apiDescription Stops transform
   *
   * @apiSchema (body) stopTransformsRequestSchema
   */
  router.versioned
    .post({
      path: addInternalBasePath('stop_transforms'),
      access: 'internal',
    })
    .addVersion<undefined, undefined, StopTransformsRequestSchema>(
      {
        version: '1',
        validate: {
          request: {
            body: stopTransformsRequestSchema,
          },
        },
      },
      license.guardApiRoute<undefined, undefined, StopTransformsRequestSchema>(
        stopTransformsHandler
      )
    );

  /**
   * @apiGroup Transforms
   *
   * @api {post} /internal/transform/schedule_now_transforms Schedules transforms now
   * @apiName PostScheduleNowTransforms
   * @apiDescription Schedules transforms now
   *
   * @apiSchema (body) scheduleNowTransformsRequestSchema
   */
  router.versioned
    .post({
      path: addInternalBasePath('schedule_now_transforms'),
      access: 'internal',
    })
    .addVersion<undefined, undefined, ScheduleNowTransformsRequestSchema>(
      {
        version: '1',
        validate: {
          request: {
            body: scheduleNowTransformsRequestSchema,
          },
        },
      },
      license.guardApiRoute<undefined, undefined, ScheduleNowTransformsRequestSchema>(
        scheduleNowTransformsHandler
      )
    );

  registerTransformsAuditMessagesRoutes(routeDependencies);
  registerTransformNodesRoutes(routeDependencies);
}

async function getDataViewId(indexName: string, dataViewsService: DataViewsService) {
  const dv = (await dataViewsService.find(indexName)).find(({ title }) => title === indexName);
  return dv?.id;
}

async function deleteDestDataViewById(dataViewId: string, dataViewsService: DataViewsService) {
  return await dataViewsService.delete(dataViewId);
}

async function deleteTransforms(
  reqBody: DeleteTransformsRequestSchema,
  ctx: RequestHandlerContext,
  response: KibanaResponseFactory,
  dataViewsService: DataViewsService
) {
  const { transformsInfo } = reqBody;

  // Cast possible undefineds as booleans
  const deleteDestIndex = !!reqBody.deleteDestIndex;
  const deleteDestDataView = !!reqBody.deleteDestDataView;
  const shouldForceDelete = !!reqBody.forceDelete;

  const results: DeleteTransformsResponseSchema = {};

  const coreContext = await ctx.core;
  const esClient = coreContext.elasticsearch.client;

  for (const transformInfo of transformsInfo) {
    let destinationIndex: string | undefined;

    const transformDeleted: ResponseStatus = { success: false };
    const destIndexDeleted: ResponseStatus = { success: false };
    const destDataViewDeleted: ResponseStatus = {
      success: false,
    };
    const transformId = transformInfo.id;
    // force delete only if the transform has failed
    let needToForceDelete = false;

    try {
      if (transformInfo.state === TRANSFORM_STATE.FAILED) {
        needToForceDelete = true;
      }
      if (!shouldForceDelete) {
        // Grab destination index info to delete
        try {
          const body = await esClient.asCurrentUser.transform.getTransform({
            transform_id: transformId,
          });
          const transformConfig = body.transforms[0];
          destinationIndex = transformConfig.dest.index;
        } catch (getTransformConfigError) {
          transformDeleted.error = getTransformConfigError.meta.body.error;
          results[transformId] = {
            transformDeleted,
            destIndexDeleted,
            destDataViewDeleted,
            destinationIndex,
          };
          // No need to perform further delete attempts
          continue;
        }
      }

      // Delete the data view if there's a data view that matches the name of dest index
      if (destinationIndex && deleteDestDataView) {
        try {
          const dataViewId = await getDataViewId(destinationIndex, dataViewsService);
          if (dataViewId) {
            await deleteDestDataViewById(dataViewId, dataViewsService);
            destDataViewDeleted.success = true;
          }
        } catch (deleteDestDataViewError) {
          destDataViewDeleted.error = deleteDestDataViewError.meta.body.error;
        }
      }

      try {
        await esClient.asCurrentUser.transform.deleteTransform({
          transform_id: transformId,
          force: shouldForceDelete && needToForceDelete,
          // @ts-expect-error ES type needs to be updated
          delete_dest_index: deleteDestIndex,
        });
        transformDeleted.success = true;
        destIndexDeleted.success = deleteDestIndex;
      } catch (deleteTransformJobError) {
        transformDeleted.error = deleteTransformJobError.meta.body.error;
        if (deleteTransformJobError.statusCode === 403) {
          return response.forbidden();
        }
      }

      results[transformId] = {
        transformDeleted,
        destIndexDeleted,
        destDataViewDeleted,
        destinationIndex,
      };
    } catch (e) {
      if (isRequestTimeout(e)) {
        return fillResultsWithTimeouts({
          results,
          id: transformInfo.id,
          items: transformsInfo,
          action: TRANSFORM_ACTIONS.DELETE,
        });
      }
      results[transformId] = { transformDeleted: { success: false, error: e.meta.body.error } };
    }
  }
  return results;
}

async function resetTransforms(
  reqBody: ResetTransformsRequestSchema,
  ctx: RequestHandlerContext,
  response: KibanaResponseFactory
) {
  const { transformsInfo } = reqBody;

  const results: ResetTransformsResponseSchema = {};
  const esClient = (await ctx.core).elasticsearch.client;

  for (const transformInfo of transformsInfo) {
    const transformReset: ResponseStatus = { success: false };
    const transformId = transformInfo.id;

    try {
      try {
        await esClient.asCurrentUser.transform.resetTransform({
          transform_id: transformId,
        });
        transformReset.success = true;
      } catch (resetTransformJobError) {
        transformReset.error = resetTransformJobError.meta.body.error;
        if (resetTransformJobError.statusCode === 403) {
          return response.forbidden();
        }
      }

      results[transformId] = {
        transformReset,
      };
    } catch (e) {
      if (isRequestTimeout(e)) {
        return fillResultsWithTimeouts({
          results,
          id: transformInfo.id,
          items: transformsInfo,
          action: TRANSFORM_ACTIONS.RESET,
        });
      }
      results[transformId] = { transformReset: { success: false, error: e.meta.body.error } };
    }
  }
  return results;
}

const previewTransformHandler: RequestHandler<
  undefined,
  undefined,
  PostTransformsPreviewRequestSchema
> = async (ctx, req, res) => {
  try {
    const reqBody = req.body;
    const esClient = (await ctx.core).elasticsearch.client;
    const body = await esClient.asCurrentUser.transform.previewTransform(
      {
        body: reqBody,
      },
      { maxRetries: 0 }
    );
    if (isLatestTransform(reqBody)) {
      // for the latest transform mappings properties have to be retrieved from the source
      const fieldCapsResponse = await esClient.asCurrentUser.fieldCaps(
        {
          index: reqBody.source.index,
          fields: '*',
          include_unmapped: false,
        },
        { maxRetries: 0 }
      );

      const fieldNamesSet = new Set(Object.keys(fieldCapsResponse.fields));

      const fields = Object.entries(
        fieldCapsResponse.fields as Record<string, Record<string, { type: string }>>
      ).reduce((acc, [fieldName, fieldCaps]) => {
        const fieldDefinition = Object.values(fieldCaps)[0];
        const isMetaField = fieldDefinition.type.startsWith('_') || fieldName === '_doc_count';
        if (isMetaField || isKeywordDuplicate(fieldName, fieldNamesSet)) {
          return acc;
        }
        acc[fieldName] = { ...fieldDefinition };
        return acc;
      }, {} as Record<string, { type: string }>);

      body.generated_dest_index.mappings!.properties = fields as Record<
        string,
        estypes.MappingProperty
      >;
    }
    return res.ok({ body });
  } catch (e) {
    return res.customError(wrapError(wrapEsError(e)));
  }
};

const startTransformsHandler: RequestHandler<
  undefined,
  undefined,
  StartTransformsRequestSchema
> = async (ctx, req, res) => {
  const transformsInfo = req.body;

  try {
    const esClient = (await ctx.core).elasticsearch.client;
    const body = await startTransforms(transformsInfo, esClient.asCurrentUser);
    return res.ok({
      body,
    });
  } catch (e) {
    return res.customError(wrapError(wrapEsError(e)));
  }
};

async function startTransforms(
  transformsInfo: StartTransformsRequestSchema,
  esClient: ElasticsearchClient
) {
  const results: StartTransformsResponseSchema = {};

  for (const transformInfo of transformsInfo) {
    const transformId = transformInfo.id;
    try {
      await esClient.transform.startTransform({
        transform_id: transformId,
      });
      results[transformId] = { success: true };
    } catch (e) {
      if (isRequestTimeout(e)) {
        return fillResultsWithTimeouts({
          results,
          id: transformId,
          items: transformsInfo,
          action: TRANSFORM_ACTIONS.START,
        });
      }
      results[transformId] = { success: false, error: e.meta.body.error };
    }
  }
  return results;
}

const stopTransformsHandler: RequestHandler<
  undefined,
  undefined,
  StopTransformsRequestSchema
> = async (ctx, req, res) => {
  const transformsInfo = req.body;

  try {
    const esClient = (await ctx.core).elasticsearch.client;
    return res.ok({
      body: await stopTransforms(transformsInfo, esClient.asCurrentUser),
    });
  } catch (e) {
    return res.customError(wrapError(wrapEsError(e)));
  }
};

async function stopTransforms(
  transformsInfo: StopTransformsRequestSchema,
  esClient: ElasticsearchClient
) {
  const results: StopTransformsResponseSchema = {};

  for (const transformInfo of transformsInfo) {
    const transformId = transformInfo.id;
    try {
      await esClient.transform.stopTransform({
        transform_id: transformId,
        force:
          transformInfo.state !== undefined
            ? transformInfo.state === TRANSFORM_STATE.FAILED
            : false,
        wait_for_completion: true,
      });
      results[transformId] = { success: true };
    } catch (e) {
      if (isRequestTimeout(e)) {
        return fillResultsWithTimeouts({
          results,
          id: transformId,
          items: transformsInfo,
          action: TRANSFORM_ACTIONS.STOP,
        });
      }
      results[transformId] = { success: false, error: e.meta.body.error };
    }
  }
  return results;
}

const scheduleNowTransformsHandler: RequestHandler<
  undefined,
  undefined,
  ScheduleNowTransformsRequestSchema
> = async (ctx, req, res) => {
  const transformsInfo = req.body;

  try {
    const esClient = (await ctx.core).elasticsearch.client;
    return res.ok({
      body: await scheduleNowTransforms(transformsInfo, esClient.asCurrentUser),
    });
  } catch (e) {
    return res.customError(wrapError(wrapEsError(e)));
  }
};

async function scheduleNowTransforms(
  transformsInfo: ScheduleNowTransformsRequestSchema,
  esClient: ElasticsearchClient
) {
  const results: ScheduleNowTransformsResponseSchema = {};

  for (const transformInfo of transformsInfo) {
    const transformId = transformInfo.id;
    try {
      await esClient.transport.request({
        method: 'POST',
        path: `_transform/${transformId}/_schedule_now`,
      });

      results[transformId] = { success: true };
    } catch (e) {
      if (isRequestTimeout(e)) {
        return fillResultsWithTimeouts({
          results,
          id: transformId,
          items: transformsInfo,
          action: TRANSFORM_ACTIONS.SCHEDULE_NOW,
        });
      }
      results[transformId] = { success: false, error: e.meta.body.error };
    }
  }
  return results;
}

async function reauthorizeAndStartTransforms(
  transformsInfo: ReauthorizeTransformsRequestSchema,
  esClient: ElasticsearchClient,
  options?: TransportRequestOptions
) {
  const results: ReauthorizeTransformsResponseSchema = {};

  for (const transformInfo of transformsInfo) {
    const transformId = transformInfo.id;
    try {
      await esClient.transform.updateTransform(
        {
          body: {},
          transform_id: transformId,
        },
        options ?? {}
      );

      await esClient.transform.startTransform(
        {
          transform_id: transformId,
        },
        { ignore: [409] }
      );

      results[transformId] = { success: true };
    } catch (e) {
      if (isRequestTimeout(e)) {
        return fillResultsWithTimeouts({
          results,
          id: transformId,
          items: transformsInfo,
          action: TRANSFORM_ACTIONS.REAUTHORIZE,
        });
      }
      results[transformId] = { success: false, error: e.meta.body.error };
    }
  }
  return results;
}
