/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, RequestHandler } from '@kbn/core/server';

import { addInternalBasePath } from '../../../common/constants';
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
