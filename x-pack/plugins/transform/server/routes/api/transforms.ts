/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, RequestHandler } from '@kbn/core/server';

import { addInternalBasePath, TRANSFORM_STATE } from '../../../common/constants';
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

import { RouteDependencies } from '../../types';

import {
  isRequestTimeout,
  fillResultsWithTimeouts,
  wrapError,
  wrapEsError,
} from '../utils/error_utils';

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
