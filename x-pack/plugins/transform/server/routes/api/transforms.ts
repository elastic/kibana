/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { schema } from '@kbn/config-schema';

import {
  KibanaResponseFactory,
  RequestHandler,
  RequestHandlerContext,
  SavedObjectsClientContract,
  LegacyAPICaller,
} from 'kibana/server';

import { TRANSFORM_STATE } from '../../../common/constants';
import { TransformId } from '../../../common/types/transform';
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
  postTransformsUpdateRequestSchema,
  PostTransformsUpdateRequestSchema,
  PostTransformsUpdateResponseSchema,
} from '../../../common/api_schemas/update_transforms';
import {
  GetTransformsResponseSchema,
  postTransformsPreviewRequestSchema,
  PostTransformsPreviewRequestSchema,
  putTransformsRequestSchema,
  PutTransformsRequestSchema,
  PutTransformsResponseSchema,
} from '../../../common/api_schemas/transforms';

import { RouteDependencies } from '../../types';

import { addBasePath } from '../index';

import { isRequestTimeout, fillResultsWithTimeouts, wrapError, wrapEsError } from './error_utils';
import { registerTransformsAuditMessagesRoutes } from './transforms_audit_messages';
import { IIndexPattern } from '../../../../../../src/plugins/data/common/index_patterns';

enum TRANSFORM_ACTIONS {
  STOP = 'stop',
  START = 'start',
  DELETE = 'delete',
}

interface StopOptions {
  transformId: TransformId;
  force: boolean;
  waitForCompletion?: boolean;
}

export function registerTransformsRoutes(routeDependencies: RouteDependencies) {
  const { router, license } = routeDependencies;
  /**
   * @apiGroup Transforms
   *
   * @api {get} /api/transform/transforms Get transforms
   * @apiName GetTransforms
   * @apiDescription Returns transforms
   *
   * @apiSchema (params) jobAuditMessagesJobIdSchema
   * @apiSchema (query) jobAuditMessagesQuerySchema
   */
  router.get(
    { path: addBasePath('transforms'), validate: false },
    license.guardApiRoute(async (ctx, req, res) => {
      const options = {};
      try {
        const transforms = await getTransforms(
          options,
          ctx.transform!.dataClient.callAsCurrentUser
        );
        return res.ok({ body: transforms });
      } catch (e) {
        return res.customError(wrapError(wrapEsError(e)));
      }
    })
  );

  /**
   * @apiGroup Transforms
   *
   * @api {get} /api/transform/transforms/:transformId Get transform
   * @apiName GetTransform
   * @apiDescription Returns a single transform
   *
   * @apiSchema (params) transformIdParamSchema
   */
  router.get<TransformIdParamSchema, undefined, undefined>(
    {
      path: addBasePath('transforms/{transformId}'),
      validate: { params: transformIdParamSchema },
    },
    license.guardApiRoute<TransformIdParamSchema, undefined, undefined>(async (ctx, req, res) => {
      const { transformId } = req.params;
      const options = transformId !== undefined ? { transformId } : {};
      try {
        const transforms = await getTransforms(
          options,
          ctx.transform!.dataClient.callAsCurrentUser
        );
        return res.ok({ body: transforms });
      } catch (e) {
        return res.customError(wrapError(wrapEsError(e)));
      }
    })
  );

  /**
   * @apiGroup Transforms
   *
   * @api {get} /api/transform/transforms/_stats Get transforms stats
   * @apiName GetTransformsStats
   * @apiDescription Returns transforms stats
   */
  router.get(
    { path: addBasePath('transforms/_stats'), validate: false },
    license.guardApiRoute(async (ctx, req, res) => {
      const options = {};
      try {
        const stats = await ctx.transform!.dataClient.callAsCurrentUser(
          'transform.getTransformsStats',
          options
        );
        return res.ok({ body: stats });
      } catch (e) {
        return res.customError(wrapError(wrapEsError(e)));
      }
    })
  );

  /**
   * @apiGroup Transforms
   *
   * @api {get} /api/transform/transforms/:transformId/_stats Get transform stats
   * @apiName GetTransformStats
   * @apiDescription Returns stats for a single transform
   *
   * @apiSchema (params) transformIdParamSchema
   */
  router.get<TransformIdParamSchema, undefined, undefined>(
    {
      path: addBasePath('transforms/{transformId}/_stats'),
      validate: { params: transformIdParamSchema },
    },
    license.guardApiRoute<TransformIdParamSchema, undefined, undefined>(async (ctx, req, res) => {
      const { transformId } = req.params;
      const options = {
        ...(transformId !== undefined ? { transformId } : {}),
      };
      try {
        const stats = await ctx.transform!.dataClient.callAsCurrentUser(
          'transform.getTransformsStats',
          options
        );
        return res.ok({ body: stats });
      } catch (e) {
        return res.customError(wrapError(wrapEsError(e)));
      }
    })
  );
  registerTransformsAuditMessagesRoutes(routeDependencies);

  /**
   * @apiGroup Transforms
   *
   * @api {put} /api/transform/transforms/:transformId Put transform
   * @apiName PutTransform
   * @apiDescription Creates a transform
   *
   * @apiSchema (params) transformIdParamSchema
   * @apiSchema (body) putTransformsRequestSchema
   */
  router.put<TransformIdParamSchema, undefined, PutTransformsRequestSchema>(
    {
      path: addBasePath('transforms/{transformId}'),
      validate: {
        params: transformIdParamSchema,
        body: putTransformsRequestSchema,
      },
    },
    license.guardApiRoute<TransformIdParamSchema, undefined, PutTransformsRequestSchema>(
      async (ctx, req, res) => {
        const { transformId } = req.params;

        const response: PutTransformsResponseSchema = {
          transformsCreated: [],
          errors: [],
        };

        await ctx
          .transform!.dataClient.callAsCurrentUser('transform.createTransform', {
            body: req.body,
            transformId,
          })
          .then(() => response.transformsCreated.push({ transform: transformId }))
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
   * @api {post} /api/transform/transforms/:transformId/_update Post transform update
   * @apiName PostTransformUpdate
   * @apiDescription Updates a transform
   *
   * @apiSchema (params) transformIdParamSchema
   * @apiSchema (body) postTransformsUpdateRequestSchema
   */
  router.post<TransformIdParamSchema, undefined, PostTransformsUpdateRequestSchema>(
    {
      path: addBasePath('transforms/{transformId}/_update'),
      validate: {
        params: transformIdParamSchema,
        body: postTransformsUpdateRequestSchema,
      },
    },
    license.guardApiRoute<TransformIdParamSchema, undefined, PostTransformsUpdateRequestSchema>(
      async (ctx, req, res) => {
        const { transformId } = req.params;

        try {
          return res.ok({
            body: (await ctx.transform!.dataClient.callAsCurrentUser('transform.updateTransform', {
              body: req.body,
              transformId,
            })) as PostTransformsUpdateResponseSchema,
          });
        } catch (e) {
          return res.customError(wrapError(e));
        }
      }
    )
  );

  /**
   * @apiGroup Transforms
   *
   * @api {post} /api/transform/delete_transforms Post delete transforms
   * @apiName DeleteTransforms
   * @apiDescription Deletes transforms
   *
   * @apiSchema (body) deleteTransformsRequestSchema
   */
  router.post<undefined, undefined, DeleteTransformsRequestSchema>(
    {
      path: addBasePath('delete_transforms'),
      validate: {
        body: deleteTransformsRequestSchema,
      },
    },
    license.guardApiRoute<undefined, undefined, DeleteTransformsRequestSchema>(
      async (ctx, req, res) => {
        try {
          const body = await deleteTransforms(req.body, ctx, res);

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
   * @api {post} /api/transform/transforms/_preview Preview transform
   * @apiName PreviewTransform
   * @apiDescription Previews transform
   *
   * @apiSchema (body) postTransformsPreviewRequestSchema
   */
  router.post<undefined, undefined, PostTransformsPreviewRequestSchema>(
    {
      path: addBasePath('transforms/_preview'),
      validate: {
        body: postTransformsPreviewRequestSchema,
      },
    },
    license.guardApiRoute<undefined, undefined, PostTransformsPreviewRequestSchema>(
      previewTransformHandler
    )
  );

  /**
   * @apiGroup Transforms
   *
   * @api {post} /api/transform/start_transforms Start transforms
   * @apiName PostStartTransforms
   * @apiDescription Starts transform
   *
   * @apiSchema (body) startTransformsRequestSchema
   */
  router.post<undefined, undefined, StartTransformsRequestSchema>(
    {
      path: addBasePath('start_transforms'),
      validate: {
        body: startTransformsRequestSchema,
      },
    },
    license.guardApiRoute<undefined, undefined, StartTransformsRequestSchema>(
      startTransformsHandler
    )
  );

  /**
   * @apiGroup Transforms
   *
   * @api {post} /api/transform/stop_transforms Stop transforms
   * @apiName PostStopTransforms
   * @apiDescription Stops transform
   *
   * @apiSchema (body) stopTransformsRequestSchema
   */
  router.post<undefined, undefined, StopTransformsRequestSchema>(
    {
      path: addBasePath('stop_transforms'),
      validate: {
        body: stopTransformsRequestSchema,
      },
    },
    license.guardApiRoute<undefined, undefined, StopTransformsRequestSchema>(stopTransformsHandler)
  );

  /**
   * @apiGroup Transforms
   *
   * @api {post} /api/transform/es_search Transform ES Search Proxy
   * @apiName PostTransformEsSearchProxy
   * @apiDescription ES Search Proxy
   *
   * @apiSchema (body) any
   */
  router.post(
    {
      path: addBasePath('es_search'),
      validate: {
        body: schema.maybe(schema.any()),
      },
    },
    license.guardApiRoute(async (ctx, req, res) => {
      try {
        return res.ok({
          body: await ctx.transform!.dataClient.callAsCurrentUser('search', req.body),
        });
      } catch (e) {
        return res.customError(wrapError(wrapEsError(e)));
      }
    })
  );
}

const getTransforms = async (
  options: { transformId?: string },
  callAsCurrentUser: LegacyAPICaller
): Promise<GetTransformsResponseSchema> => {
  return await callAsCurrentUser('transform.getTransforms', options);
};

async function getIndexPatternId(
  indexName: string,
  savedObjectsClient: SavedObjectsClientContract
) {
  const response = await savedObjectsClient.find<IIndexPattern>({
    type: 'index-pattern',
    perPage: 1,
    search: `"${indexName}"`,
    searchFields: ['title'],
    fields: ['title'],
  });
  const ip = response.saved_objects.find((obj) => obj.attributes.title === indexName);
  return ip?.id;
}

async function deleteDestIndexPatternById(
  indexPatternId: string,
  savedObjectsClient: SavedObjectsClientContract
) {
  return await savedObjectsClient.delete('index-pattern', indexPatternId);
}

async function deleteTransforms(
  reqBody: DeleteTransformsRequestSchema,
  ctx: RequestHandlerContext,
  response: KibanaResponseFactory
) {
  const { transformsInfo } = reqBody;

  // Cast possible undefineds as booleans
  const deleteDestIndex = !!reqBody.deleteDestIndex;
  const deleteDestIndexPattern = !!reqBody.deleteDestIndexPattern;
  const shouldForceDelete = !!reqBody.forceDelete;

  const results: DeleteTransformsResponseSchema = {};

  for (const transformInfo of transformsInfo) {
    let destinationIndex: string | undefined;

    const transformDeleted: ResponseStatus = { success: false };
    const destIndexDeleted: ResponseStatus = { success: false };
    const destIndexPatternDeleted: ResponseStatus = {
      success: false,
    };
    const transformId = transformInfo.id;
    // force delete only if the transform has failed
    let needToForceDelete = false;

    try {
      if (transformInfo.state === TRANSFORM_STATE.FAILED) {
        needToForceDelete = true;
      }
      // Grab destination index info to delete
      try {
        const transformConfigs = await getTransforms(
          { transformId },
          ctx.transform!.dataClient.callAsCurrentUser
        );
        const transformConfig = transformConfigs.transforms[0];
        destinationIndex = Array.isArray(transformConfig.dest.index)
          ? transformConfig.dest.index[0]
          : transformConfig.dest.index;
      } catch (getTransformConfigError) {
        transformDeleted.error = wrapError(getTransformConfigError);
        results[transformId] = {
          transformDeleted,
          destIndexDeleted,
          destIndexPatternDeleted,
          destinationIndex,
        };
        continue;
      }

      // If user checks box to delete the destinationIndex associated with the job
      if (destinationIndex && deleteDestIndex) {
        try {
          // If user does have privilege to delete the index, then delete the index
          // if no permission then return 403 forbidden
          await ctx.transform!.dataClient.callAsCurrentUser('indices.delete', {
            index: destinationIndex,
          });
          destIndexDeleted.success = true;
        } catch (deleteIndexError) {
          destIndexDeleted.error = wrapError(deleteIndexError);
        }
      }

      // Delete the index pattern if there's an index pattern that matches the name of dest index
      if (destinationIndex && deleteDestIndexPattern) {
        try {
          const indexPatternId = await getIndexPatternId(
            destinationIndex,
            ctx.core.savedObjects.client
          );
          if (indexPatternId) {
            await deleteDestIndexPatternById(indexPatternId, ctx.core.savedObjects.client);
            destIndexPatternDeleted.success = true;
          }
        } catch (deleteDestIndexPatternError) {
          destIndexPatternDeleted.error = wrapError(deleteDestIndexPatternError);
        }
      }

      try {
        await ctx.transform!.dataClient.callAsCurrentUser('transform.deleteTransform', {
          transformId,
          force: shouldForceDelete && needToForceDelete,
        });
        transformDeleted.success = true;
      } catch (deleteTransformJobError) {
        transformDeleted.error = wrapError(deleteTransformJobError);
        if (transformDeleted.error.statusCode === 403) {
          return response.forbidden();
        }
      }

      results[transformId] = {
        transformDeleted,
        destIndexDeleted,
        destIndexPatternDeleted,
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
      results[transformId] = { transformDeleted: { success: false, error: JSON.stringify(e) } };
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
    return res.ok({
      body: await ctx.transform!.dataClient.callAsCurrentUser('transform.getTransformsPreview', {
        body: req.body,
      }),
    });
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
    return res.ok({
      body: await startTransforms(transformsInfo, ctx.transform!.dataClient.callAsCurrentUser),
    });
  } catch (e) {
    return res.customError(wrapError(wrapEsError(e)));
  }
};

async function startTransforms(
  transformsInfo: StartTransformsRequestSchema,
  callAsCurrentUser: LegacyAPICaller
) {
  const results: StartTransformsResponseSchema = {};

  for (const transformInfo of transformsInfo) {
    const transformId = transformInfo.id;
    try {
      await callAsCurrentUser('transform.startTransform', { transformId });
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
      results[transformId] = { success: false, error: JSON.stringify(e) };
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
    return res.ok({
      body: await stopTransforms(transformsInfo, ctx.transform!.dataClient.callAsCurrentUser),
    });
  } catch (e) {
    return res.customError(wrapError(wrapEsError(e)));
  }
};

async function stopTransforms(
  transformsInfo: StopTransformsRequestSchema,
  callAsCurrentUser: LegacyAPICaller
) {
  const results: StopTransformsResponseSchema = {};

  for (const transformInfo of transformsInfo) {
    const transformId = transformInfo.id;
    try {
      await callAsCurrentUser('transform.stopTransform', {
        transformId,
        force:
          transformInfo.state !== undefined
            ? transformInfo.state === TRANSFORM_STATE.FAILED
            : false,
        waitForCompletion: true,
      } as StopOptions);
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
      results[transformId] = { success: false, error: JSON.stringify(e) };
    }
  }
  return results;
}
