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

import { addInternalBasePath, TRANSFORM_STATE } from '../../../common/constants';
import { ResponseStatus } from '../../../common/api_schemas/common';
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
  postTransformsPreviewRequestSchema,
  PostTransformsPreviewRequestSchema,
} from '../../../common/api_schemas/transforms';

import { RouteDependencies } from '../../types';

import {
  isRequestTimeout,
  fillResultsWithTimeouts,
  wrapError,
  wrapEsError,
} from '../utils/error_utils';

import { isLatestTransform } from '../../../common/types/transform';
import { isKeywordDuplicate } from '../../../common/utils/field_utils';

enum TRANSFORM_ACTIONS {
  DELETE = 'delete',
  REAUTHORIZE = 'reauthorize',
  RESET = 'reset',
  SCHEDULE_NOW = 'schedule_now',
  STOP = 'stop',
  START = 'start',
}

export function registerTransformsRoutes(routeDependencies: RouteDependencies) {
  const { router, license } = routeDependencies;

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
